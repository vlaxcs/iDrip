import os
import json
import logging
from typing import TypedDict, List, Optional, Dict, Any, Annotated
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")
LLM_API_KEY = os.getenv("LLM_API_KEY", os.getenv("OPENAI_API_KEY", ""))
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")

app = FastAPI(title="iDrip AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class Preferences(BaseModel):
    occasion: Optional[str] = None
    weather: Optional[str] = None
    season: Optional[str] = None
    free_text: Optional[str] = None
    feedback: Optional[str] = None


class GenerateRequest(BaseModel):
    user_id: str
    preferences: Preferences = Preferences()
    wardrobe_items: List[Dict[str, Any]]
    locked_item_ids: List[str] = []


class SearchRequest(BaseModel):
    user_id: str
    query: str
    wardrobe_items: List[Dict[str, Any]] = []


# ---------------------------------------------------------------------------
# LangGraph State
# ---------------------------------------------------------------------------
class OutfitState(TypedDict):
    user_id: str
    wardrobe_items: List[Dict[str, Any]]
    preferences: Dict[str, Any]
    locked_item_ids: List[str]
    categorized: Dict[str, List[Dict[str, Any]]]
    selected_outfit: Optional[Dict[str, Any]]
    errors: List[str]


# ---------------------------------------------------------------------------
# LLM setup
# ---------------------------------------------------------------------------
def get_llm(temperature: float = 0.3) -> ChatOpenAI:
    if not LLM_API_KEY:
        raise ValueError("No LLM API key configured. Set LLM_API_KEY or OPENAI_API_KEY.")
    return ChatOpenAI(
        model=LLM_MODEL,
        api_key=LLM_API_KEY,
        base_url=LLM_BASE_URL,
        temperature=temperature,
        max_tokens=4096,
        timeout=90,
        max_retries=2,
    )


# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------
SELECT_OUTFIT_PROMPT = """You are an expert fashion stylist AI. Your task is to create the best possible outfit from a curated selection of the user's wardrobe items.

## WARDROBE ITEM FIELDS
Each item has: id, name, category, subcategory, primaryColor (hex), secondaryColors (hex[]), colorTemperature, colorIntensity, pattern, material, texture, transparency, printType, gender, formality (1-10), occasion[], style[], season[], fit, sleeveLength, sleeveStyle, neckline, collarType, cuffStyle, length, hemStyle, closureType, rise, pleatStyle, distressing, waistbandStyle, legOpening, warmthLevel, waterResistance, hood, pockets, silhouette, backDetail, strapStyle, heelHeight, heelStyle, toeStyle, soleType, shaftHeight, accessoryType, bandWidth, sockHeight, necklaceLength, hatStyle, earringStyle, tieStyle, watchStyle, lensColor, lining.

## FASHION RULES

### 1. Color Harmony
- Complementary or analogous colors work best together
- Neutrals (black, white, gray, navy, beige, cream) anchor any outfit
- Avoid clashing combinations (red+green unless intentional, too many vibrant colors)
- Use secondaryColors to find accent opportunities
- A pop of color from one item can be the focal point

### 2. Formality Matching
- All items should be within 3 points on the formality scale (1=casual, 10=formal)
- Exception: accessories can be ±4 points
- Example: formality-8 blazer pairs with formality 6-10 bottoms and shoes

### 3. Seasonal Appropriateness
- Match materials and weights to the requested season
- For "all" or no season specified, choose versatile pieces that layer well
- Consider: lightweight fabrics (linen, cotton) for warm weather; heavier fabrics (wool, fleece) for cold

### 4. Weather Constraints
- rainy: prioritize water-resistant outerwear, avoid suede, choose closed shoes
- snowy: warm materials (wool, fleece), closed shoes, layers, water-resistant
- sunny: light materials (linen, cotton), breathable fabrics, sunglasses as accessories
- cold: warmthLevel medium/heavy/insulated, long sleeves, layers, closed shoes
- hot: light fabrics, short sleeves or sleeveless, breathable, sandals or light shoes
- windy: fitted items preferred over loose/flimsy, structured outerwear
- humid: natural breathable fabrics (cotton, linen), avoid heavy layering
- cloudy / mild: any combination works, focus on style over weather protection

### 5. Occasion Appropriateness
- casual: relaxed fits, t-shirts, jeans, sneakers, formality 1-4
- business: button-downs, trousers, blazers, loafers, formality 5-8
- formal: suits, dress shoes, ties, elegant dresses, formality 7-10
- date: polished but personal, balanced effort, formality 3-7
- sport: athletic materials, flexible fits, sneakers, formality 1-3
- party: statement pieces, bold accessories, vibrant colors, formality 3-8
- travel: comfortable, versatile, layered, wrinkle-resistant, formality 2-6
- beach: light fabrics, open footwear, relaxed, breathable, formality 1-2
- outdoor: practical, weather-appropriate, comfortable, durable, formality 1-4

### 6. Style Coherence
- Items should share at least one style tag where possible
- Mixing styles is acceptable if color harmony and formality align
- Example: "streetwear" + "minimalist" works with neutral colors and clean silhouettes

## OUTFIT REQUIREMENTS
1. Every outfit MUST have at minimum:
   - If dresses available: 1 dress + 1 pair of shoes
   - Otherwise: 1 top + 1 bottom + 1 pair of shoes
2. Outerwear and accessories are OPTIONAL — only include if they improve the outfit
3. Each item can only be used ONCE
4. Prefer items with higher aiConfidence when choosing between similar options

## SURPRISE ME MODE
When no constraints are provided (surprise_me = true):
- 60% probability: pick the most harmonious, style-compatible combination
- 40% probability: pick a creative/novel combination the user likely hasn't tried before
- Novelty means pairing items from different style categories that still work together

## FEEDBACK MODE
When feedback is provided, treat it as the PRIMARY constraint:
- "too formal" → lower formality by 3+ points
- "too casual" → raise formality by 3+ points
- "colors clash" → choose items with more harmonious colors
- "not weather-appropriate" → re-evaluate weather constraints strictly
- "don't like specific items" → exclude those items entirely

## OUTPUT FORMAT
Return ONLY a valid JSON object. No markdown, no code fences, no extra text.

{
  "selected_item_ids": ["id1", "id2", "id3"],
  "outfit_name": "creative, descriptive name (max 40 chars)",
  "score": <integer 1-100>,
  "reasoning": "<2-3 sentences explaining why this outfit works. Mention specific items by name, color harmony, formality alignment, and how it satisfies the constraints>",
  "occasion": "<best occasion label for this outfit>",
  "color_scheme": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "weather_score": <integer 1-10, how well this outfit handles the weather>,
  "style_score": <integer 1-10, internal style coherence>
}"""


# ---------------------------------------------------------------------------
# Helper: build item summary for the prompt
# ---------------------------------------------------------------------------
RELEVANT_KEYS = [
    "id", "name", "category", "subcategory", "primaryColor", "secondaryColors",
    "colorTemperature", "colorIntensity", "pattern", "material", "texture",
    "transparency", "printType", "gender", "formality", "occasion", "style",
    "season", "fit", "sleeveLength", "sleeveStyle", "neckline", "collarType",
    "cuffStyle", "length", "hemStyle", "closureType", "rise", "pleatStyle",
    "distressing", "waistbandStyle", "legOpening", "warmthLevel", "waterResistance",
    "hood", "pockets", "silhouette", "backDetail", "strapStyle", "heelHeight",
    "heelStyle", "toeStyle", "soleType", "shaftHeight", "accessoryType",
    "bandWidth", "sockHeight", "necklaceLength", "hatStyle", "earringStyle",
    "tieStyle", "watchStyle", "lensColor", "lining", "aiConfidence",
]


def summarize_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Strip an item down to only the fields the AI needs to see."""
    return {k: item.get(k) for k in RELEVANT_KEYS if k in item}


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

def validate_wardrobe(state: OutfitState) -> OutfitState:
    """Validate wardrobe items and categorize by type."""
    items = state.get("wardrobe_items", [])
    errors: List[str] = []

    if not items:
        errors.append("No wardrobe items provided")
        state["errors"] = errors
        return state

    categorized: Dict[str, List[Dict]] = {
        "tops": [], "bottoms": [], "shoes": [],
        "outerwear": [], "dresses": [], "accessories": [],
    }

    for item in items:
        cat = item.get("category", "")
        if cat in categorized:
            categorized[cat].append(item)

    # Check minimum requirements
    has_standard = (
        len(categorized["tops"]) >= 1
        and len(categorized["bottoms"]) >= 1
        and len(categorized["shoes"]) >= 1
    )
    has_dress = (
        len(categorized["dresses"]) >= 1
        and len(categorized["shoes"]) >= 1
    )

    if not has_standard and not has_dress:
        errors.append(
            "Not enough items to build an outfit. "
            "Need at least 1 top + 1 bottom + 1 pair of shoes, or 1 dress + 1 pair of shoes."
        )

    state["categorized"] = categorized
    state["errors"] = errors
    return state


def select_outfit(state: OutfitState) -> OutfitState:
    """Stage 3+4 combined: LLM re-ranks and selects the final outfit."""
    items = state.get("wardrobe_items", [])
    prefs = state.get("preferences", {})
    locked_item_ids: List[str] = state.get("locked_item_ids", [])

    # Build a compact representation for the LLM
    summarized = [summarize_item(it) for it in items]

    # Build the user message
    occasion = prefs.get("occasion") or "any"
    weather = prefs.get("weather") or "any"
    season = prefs.get("season") or "any"
    free_text = prefs.get("free_text") or "none"
    feedback = prefs.get("feedback") or ""
    surprise_me = not any([prefs.get("occasion"), prefs.get("weather"),
                           prefs.get("season"), prefs.get("free_text")])

    user_message_parts = [
        "## USER PREFERENCES",
        f"Occasion: {occasion}",
        f"Weather: {weather}",
        f"Season: {season}",
        f"Additional request: {free_text}",
        f"Surprise me mode: {str(surprise_me).lower()}",
    ]
    if feedback:
        user_message_parts.append(f"## FEEDBACK FROM PREVIOUS GENERATION\n{feedback}\n(This is the PRIMARY constraint — address it above all else.)")

    if locked_item_ids:
        locked_items_info = [
            summarize_item(it) for it in items
            if str(it.get("id", it.get("_id", ""))) in locked_item_ids
        ]
        user_message_parts.append(
            f"## LOCKED ITEMS — MANDATORY\n"
            f"The user has manually selected the following item(s). You MUST include ALL of them in selected_item_ids. "
            f"Build the rest of the outfit to complement these locked pieces.\n"
            + json.dumps(locked_items_info, indent=2, default=str)
        )

    user_message_parts.append(f"\n## WARDROBE ITEMS ({len(summarized)} total, pre-filtered for relevance)\n")
    user_message_parts.append(json.dumps(summarized, indent=2, default=str))
    user_message_parts.append("\n## TASK\nSelect the best items from the wardrobe above to create an outfit that matches the user's preferences. Follow ALL fashion rules. Return valid JSON only.")

    user_message = "\n".join(user_message_parts)

    try:
        llm = get_llm(temperature=0.3)
        response = llm.invoke([
            SystemMessage(content=SELECT_OUTFIT_PROMPT),
            HumanMessage(content=user_message),
        ])
        content = response.content if hasattr(response, "content") else str(response)
        content = str(content).strip()

        # Parse JSON from response
        parsed = _extract_json(content)
        if not parsed:
            raise ValueError("Could not parse AI response as JSON")

        # Validate required fields
        required = ["selected_item_ids", "outfit_name", "score", "reasoning"]
        for field in required:
            if field not in parsed:
                raise ValueError(f"AI response missing required field: {field}")

        state["selected_outfit"] = parsed
    except Exception as exc:
        logger.error(f"select_outfit failed: {exc}")
        state["errors"] = state.get("errors", []) + [f"Outfit selection failed: {str(exc)}"]

    return state


def generate_reasoning(state: OutfitState) -> OutfitState:
    """Enrich reasoning: replace item IDs with actual names in reasoning text."""
    outfit = state.get("selected_outfit")
    if not outfit:
        return state

    items_by_id: Dict[str, Dict[str, Any]] = {}
    for it in state.get("wardrobe_items", []):
        item_id = str(it.get("id", it.get("_id", "")))
        items_by_id[item_id] = it

    # Build color scheme from selected items if not provided
    if not outfit.get("color_scheme"):
        colors = []
        for iid in outfit.get("selected_item_ids", []):
            item = items_by_id.get(str(iid))
            if item:
                pc = item.get("primaryColor")
                if pc and pc not in colors:
                    colors.append(pc)
        outfit["color_scheme"] = colors[:4] if colors else ["#000000", "#ffffff"]

    # Ensure scores are integers
    outfit["score"] = int(outfit.get("score", 80))
    outfit["weather_score"] = int(outfit.get("weather_score", 7))
    outfit["style_score"] = int(outfit.get("style_score", 7))

    state["selected_outfit"] = outfit
    return state


def format_output(state: OutfitState) -> OutfitState:
    """Validate and structure the final output."""
    outfit = state.get("selected_outfit")

    if not outfit:
        state["errors"] = state.get("errors", []) + ["No outfit was generated"]
        return state

    # Validate all selected IDs exist in the original items
    all_ids = {str(it.get("id", it.get("_id", ""))) for it in state.get("wardrobe_items", [])}
    selected = set(outfit.get("selected_item_ids", []))
    missing = selected - all_ids
    if missing:
        logger.warning(f"AI returned unknown item IDs: {missing}")

    # Deduplicate
    outfit["selected_item_ids"] = list(selected)

    # Validate score ranges
    outfit["score"] = max(1, min(100, int(outfit.get("score", 80))))
    outfit["weather_score"] = max(1, min(10, int(outfit.get("weather_score", 7))))
    outfit["style_score"] = max(1, min(10, int(outfit.get("style_score", 7))))

    # Ensure non-empty reasoning
    if not outfit.get("reasoning"):
        outfit["reasoning"] = "A carefully selected outfit based on your wardrobe and preferences."

    state["selected_outfit"] = outfit
    return state


# ---------------------------------------------------------------------------
# JSON extraction helper
# ---------------------------------------------------------------------------
def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    """Extract JSON object from LLM response (handles code fences)."""
    text = text.strip()

    # Remove code fences
    fence_match = None
    import re
    fence_pattern = re.match(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence_pattern:
        text = fence_pattern.group(1).strip()

    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find JSON object in text
    obj_match = re.search(r"\{[\s\S]*\}", text)
    if obj_match:
        try:
            return json.loads(obj_match.group(0))
        except json.JSONDecodeError:
            pass

    return None


# ---------------------------------------------------------------------------
# Build the graph
# ---------------------------------------------------------------------------
workflow = StateGraph(OutfitState)

workflow.add_node("validate_wardrobe", validate_wardrobe)
workflow.add_node("select_outfit", select_outfit)
workflow.add_node("generate_reasoning", generate_reasoning)
workflow.add_node("format_output", format_output)

workflow.set_entry_point("validate_wardrobe")

# Conditional: skip to END on validation failure
workflow.add_conditional_edges(
    "validate_wardrobe",
    lambda s: "select_outfit" if not s.get("errors") else "format_output",
    {"select_outfit": "select_outfit", "format_output": "format_output"},
)

# Conditional: skip generate_reasoning if select_outfit failed
workflow.add_conditional_edges(
    "select_outfit",
    lambda s: "generate_reasoning" if s.get("selected_outfit") and not s.get("errors") else "format_output",
    {"generate_reasoning": "generate_reasoning", "format_output": "format_output"},
)

workflow.add_edge("generate_reasoning", "format_output")
workflow.add_edge("format_output", END)

agent = workflow.compile()


# ---------------------------------------------------------------------------
# FastAPI endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "ai-service"}


@app.get("/")
def root() -> dict:
    return {"message": "iDrip AI Service is running"}


@app.post("/generate-outfit")
def generate_outfit(req: GenerateRequest) -> dict:
    """Generate an outfit from the user's wardrobe items and preferences."""
    if not LLM_API_KEY:
        raise HTTPException(status_code=503, detail="AI service is not configured — set LLM_API_KEY")

    prefs = req.preferences.model_dump() if req.preferences else {}
    prefs["surprise_me"] = not any([
        prefs.get("occasion"), prefs.get("weather"),
        prefs.get("season"), prefs.get("free_text"),
    ])

    initial: OutfitState = {
        "user_id": req.user_id,
        "wardrobe_items": req.wardrobe_items,
        "preferences": prefs,
        "locked_item_ids": req.locked_item_ids,
        "categorized": {},
        "selected_outfit": None,
        "errors": [],
    }

    logger.info(f"Generating outfit for user {req.user_id} with {len(req.wardrobe_items)} items, prefs={prefs}")

    try:
        result = agent.invoke(initial)
    except Exception as exc:
        logger.error(f"Agent invocation failed: {exc}")
        raise HTTPException(status_code=500, detail=f"AI agent error: {str(exc)}")

    errors = result.get("errors", [])
    outfit = result.get("selected_outfit")

    if errors and not outfit:
        raise HTTPException(status_code=422, detail={"errors": errors})

    response = {
        "selected_item_ids": outfit.get("selected_item_ids", []),
        "outfit_name": outfit.get("outfit_name", "Generated Outfit"),
        "score": outfit.get("score", 80),
        "reasoning": outfit.get("reasoning", ""),
        "occasion": outfit.get("occasion", prefs.get("occasion", "casual")),
        "color_scheme": outfit.get("color_scheme", []),
        "weather_score": outfit.get("weather_score", 7),
        "style_score": outfit.get("style_score", 7),
    }

    if errors:
        response["warnings"] = errors

    logger.info(f"Generated outfit '{response['outfit_name']}' score={response['score']}")
    return response


@app.post("/search-wardrobe")
def search_wardrobe(req: SearchRequest) -> dict:
    """Search wardrobe items by natural language query. Returns structured filters + semantic query."""
    if not LLM_API_KEY:
        raise HTTPException(status_code=503, detail="AI service is not configured — set LLM_API_KEY")

    # For now, return the query as a semantic search string
    # Future: use LLM to parse into structured filters
    return {
        "semantic_query": req.query,
        "filters": {},
        "intent": "search_wardrobe",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))

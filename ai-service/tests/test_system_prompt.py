"""Sanity tests on the LangGraph system prompt — guards against accidental edits."""
import importlib


def _prompt() -> str:
    import main as main_module
    importlib.reload(main_module)
    return main_module.SELECT_OUTFIT_PROMPT


def test_prompt_documents_the_50_field_wardrobe_schema():
    """The schema reference is what lets the LLM produce well-typed selections.
    If a future edit drops these fields, the model will hallucinate values."""
    prompt = _prompt()
    required_fields = [
        "id", "name", "category", "subcategory", "primaryColor", "secondaryColors",
        "formality", "occasion", "style", "season", "fit", "sleeveLength",
        "warmthLevel", "waterResistance", "heelHeight", "soleType",
    ]
    missing = [f for f in required_fields if f not in prompt]
    assert not missing, f"Missing wardrobe fields in system prompt: {missing}"


def test_prompt_includes_output_format_contract():
    prompt = _prompt()
    for key in ["selected_item_ids", "outfit_name", "score", "reasoning", "occasion"]:
        assert key in prompt, f"Output contract missing key: {key}"


def test_prompt_includes_fashion_rules_sections():
    prompt = _prompt()
    for header in ["Color Harmony", "Formality Matching", "Seasonal Appropriateness", "Occasion Appropriateness"]:
        assert header in prompt, f"Fashion rule section missing: {header}"

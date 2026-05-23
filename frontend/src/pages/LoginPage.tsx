import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import AnimatedTextCycle from "@/components/ui/animated-text-cycle";
import { Toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

// Inline iDrip wordmark — first path is the teardrop 'i' icon, kept as a
// motion.path so it can wobble left↔right independently while the Google
// button is hovered. Source: src/assets/logo-wide-dark.svg
function IDripLogoSvg({
  wobble,
  className,
}: {
  wobble: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="152.26 368.02 738.37 312.28"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-foreground", className)}
      style={{ overflow: "visible" }}
      aria-label="iDrip"
    >
      <motion.path
        fill="currentColor"
        d="M279.755737,624.996826 C240.676849,636.513428 206.813110,627.952576 178.639542,599.321167 C150.511261,570.735840 144.767487,532.539673 161.954269,496.026855 C170.376358,478.134399 182.076279,462.295715 193.485062,446.313538 C211.384247,421.239136 229.762802,396.505829 246.728485,370.773865 C247.449249,369.680695 248.015900,368.405334 249.423096,368.023224 C251.026611,368.259430 251.544815,369.611298 252.232407,370.697693 C270.331879,399.296692 291.278656,425.884949 310.669464,453.569977 C322.132538,469.936279 333.240173,486.571960 340.264709,505.505463 C352.266357,537.853882 345.512451,567.017395 324.982269,593.635498 C313.371704,608.689087 298.100281,618.792480 279.755737,624.996826 M241.994995,529.539795 C241.987579,531.535950 242.020615,533.533203 241.965942,535.528076 C241.697449,545.326111 242.643204,555.145569 241.415619,564.927307 C240.822617,569.652527 238.262466,572.459473 233.541794,573.277832 C231.985748,573.547546 230.079163,573.282043 229.559006,576.091248 C243.263657,576.091248 256.817596,576.091248 270.550751,576.091248 C270.019318,573.217896 268.287048,573.517639 266.891968,573.296509 C262.064209,572.531006 259.001160,569.934570 258.351166,564.953430 C258.051270,562.655090 257.831940,560.327271 257.827179,558.012329 C257.792267,541.045349 257.838470,524.078247 257.820251,507.111145 C257.813843,501.124542 257.730347,501.166382 252.014542,502.016541 C246.100998,502.896149 240.160172,503.592041 234.231964,504.373413 C232.614944,504.586517 230.905243,504.602875 229.859695,506.247223 C230.586182,508.238464 232.453751,508.297455 233.965073,508.543610 C238.911545,509.349182 241.080170,512.383728 241.357422,517.120728 C241.580505,520.932129 241.785904,524.744568 241.994995,529.539795 M245.173538,460.509155 C244.596786,460.841644 243.981949,461.122375 243.449203,461.514618 C238.067825,465.476471 236.647797,471.652161 239.899246,476.866486 C242.897903,481.675415 249.807602,483.524719 254.919083,480.886353 C259.981140,478.273499 262.204498,472.241364 260.122681,466.768616 C257.954803,461.069611 252.253616,458.457886 245.173538,460.509155 z"
        style={{
          transformBox: "fill-box",
          transformOrigin: "50% 100%",
        }}
        animate={wobble ? { rotate: [5, 15, -10, 15, 5] } : { rotate: 5 }}
        transition={
          wobble
            ? { duration: 2.4, ease: "easeInOut"}
            : { duration: 0.6, ease: "easeOut" }
        }
      />
      <path fill="currentColor" d="M541.251587,507.855469 C539.665100,531.721008 533.794739,553.679810 519.197693,572.544495 C499.624817,597.839600 473.923401,612.137756 441.815826,613.149902 C417.009308,613.931946 392.159607,613.382202 367.329254,613.345947 C360.877563,613.336548 357.013367,610.199951 355.643250,603.944336 C355.114532,601.530273 354.937866,598.995544 354.936951,596.515747 C354.913818,534.689209 354.927856,472.862701 354.956390,411.036194 C354.961884,399.101013 359.375336,394.690735 371.179626,394.695557 C394.343719,394.705017 417.534241,394.027222 440.665558,394.905060 C473.363434,396.145966 501.396729,407.976227 521.379822,435.069092 C532.390930,449.997772 538.212280,467.038910 540.357727,485.441742 C541.210144,492.753387 541.369446,500.046906 541.251587,507.855469 M477.773285,436.724335 C465.484680,428.654053 451.924377,424.507477 437.291199,424.234650 C422.642273,423.961517 407.984070,424.219849 393.332458,424.038391 C389.140503,423.986511 387.312805,425.321350 387.319366,429.743744 C387.393311,479.532776 387.377808,529.322083 387.276031,579.111084 C387.268372,582.860718 388.667206,584.054138 392.261780,584.020874 C407.413544,583.880432 422.580902,584.319519 437.716461,583.794495 C460.013885,583.021057 478.241119,573.463806 491.650391,555.723694 C506.462280,536.128052 510.715698,513.577332 507.677979,489.573120 C504.978546,468.241943 496.271942,450.063782 477.773285,436.724335 z" />
      <path fill="currentColor" d="M801.447876,612.879944 C788.897888,609.191528 778.980530,602.250549 771.021179,592.104248 C769.820862,594.318542 770.250916,596.166077 770.247925,597.926331 C770.211426,619.592346 770.230957,641.258423 770.220215,662.924500 C770.213135,677.123779 758.354980,684.345581 745.455627,677.974609 C740.975708,675.761963 738.999878,671.847473 738.753296,667.038757 C738.582642,663.713745 738.684814,660.374207 738.684570,657.041138 C738.680420,596.209290 738.685181,535.377502 738.667542,474.545654 C738.665894,468.952301 738.363098,462.885773 744.468384,460.271332 C751.085083,457.437897 758.151611,457.543701 764.776794,460.783600 C767.656006,462.191589 768.856018,465.113220 769.297363,468.187317 C769.769043,471.472839 770.032471,474.788330 770.385315,478.076874 C771.254761,478.478577 771.655396,477.807556 772.004822,477.316437 C786.746033,456.596588 816.457031,450.919922 840.279724,458.081848 C866.099304,465.844208 881.404968,483.664948 887.534058,509.483398 C893.003662,532.523987 891.425720,555.120056 881.371643,576.799072 C867.216797,607.320312 835.163208,619.702698 805.744202,613.843750 C804.437622,613.583557 803.139099,613.282715 801.447876,612.879944 M785.786438,575.714905 C810.250427,596.345703 842.071960,588.602295 853.784119,558.960571 C859.676575,544.047852 859.713806,528.566895 855.290894,513.392822 C850.745728,497.799133 840.826660,486.459076 824.216553,483.647430 C806.609009,480.666962 791.403992,485.480957 780.057495,500.402313 C766.682190,517.991699 764.954346,555.146118 785.786438,575.714905 z" />
      <path fill="currentColor" d="M566.117798,468.763000 C568.482971,461.321106 571.549561,458.978729 578.957642,458.858185 C581.612610,458.815002 584.310730,458.831848 586.922363,459.244385 C592.954163,460.197174 595.907166,463.583313 596.333313,469.709259 C596.587280,473.359558 596.721008,477.018127 596.936340,480.671356 C596.964722,481.152435 597.157227,481.623840 597.447083,482.807770 C599.015808,480.432159 600.278137,478.453339 601.606262,476.519653 C612.311646,460.933197 627.522949,455.322968 645.780945,456.960358 C652.921265,457.600677 656.078186,461.016632 657.058838,468.134888 C657.635193,472.318268 657.100464,476.418701 655.630676,480.411407 C653.925293,485.043945 650.641296,487.266693 645.752197,487.320526 C641.592590,487.366333 637.395569,487.163269 633.281616,487.642181 C615.608215,489.699646 605.382751,500.395416 600.267944,516.754333 C598.119995,523.624268 597.061646,530.654419 597.093201,537.889771 C597.180481,557.873230 597.067139,577.857422 597.146423,597.840942 C597.169617,603.691528 596.225830,609.314026 590.264893,611.587891 C583.592712,614.133057 576.469849,614.470459 570.131958,610.283569 C566.871033,608.129333 565.860657,604.312744 565.860596,600.561035 C565.859680,556.767456 565.944214,512.973877 566.117798,468.763000 z" />
      <path fill="currentColor" d="M708.189209,510.000000 C708.175903,539.482056 708.149231,568.464111 708.160217,597.446167 C708.162292,602.964783 707.801941,608.628418 702.089966,611.169312 C695.659973,614.029602 688.653198,614.429810 682.341980,610.840088 C677.464355,608.065796 676.938782,602.730042 676.926025,597.612732 C676.889893,583.121826 676.955444,568.630676 676.948181,554.139648 C676.934998,527.656006 676.893677,501.172424 676.875183,474.688812 C676.871338,469.249603 676.963196,463.529694 682.715942,460.854614 C689.356384,457.766632 696.447693,457.868195 702.941589,461.297180 C707.359070,463.629700 708.160583,468.339569 708.167969,473.022552 C708.187195,485.181702 708.183472,497.340851 708.189209,510.000000 z" />
      <path fill="currentColor" d="M684.481812,433.999023 C674.908569,428.965637 671.441772,422.060822 672.703979,411.111389 C673.577271,403.536438 679.685852,396.586426 686.995483,394.851440 C696.198425,392.667084 704.428406,395.665588 709.358643,402.999207 C714.113342,410.071777 713.776123,420.488251 708.568665,427.403870 C703.051147,434.731201 694.689697,437.112762 684.481812,433.999023 z" />
    </svg>
  );
}

const BACKEND_URL =
  import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000";

// Slowed down so the entrance feels gentler.
const LOGO_FADE = 1.8;
const FADE_IN = 0.6;
const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.4, 0.25, 1];

const CYCLE_WORDS = [
  <>
    <span className="text-[#39ff14]">tailored</span>
  </>,
  <>
    <span className="text-[#39ff14]">curated</span>
  </>,
  <>
    <span className="text-[#39ff14]">refined</span>
  </>,
];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  // `entered` flips true once the simultaneous logo + button entrance is done;
  // gates the cycle text and the footer.
  const [entered, setEntered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const error = searchParams.get("error");
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    if (!error) return;
    const t = requestAnimationFrame(() => setToastOpen(true));
    return () => cancelAnimationFrame(t);
  }, [error]);

  const toastMessage =
    error === "auth_failed"
      ? "Authentication failed. Please try again."
      : "Something went wrong. Please try again.";

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), (LOGO_FADE + 0.2) * 1000);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = () => {
    setLoading(true);
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  };

  // Auth content (Google button) — shared between layouts
  const authContent = (
    <>
      <button
        onClick={handleLogin}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        disabled={loading}
        className="cursor-pointer w-full h-[60px] rounded-full flex items-center justify-center gap-3.5 font-bold text-[15px] md:text-[18px] border-2 border-[#39ff14] text-black bg-[#39ff14] shadow-[0_0_12px_rgba(57,255,20,0.55),0_12px_32px_rgba(0,0,0,0.05)] hover:shadow-[0_0_0_1px_rgba(57,255,20,0.55),0_0_22px_rgba(57,255,20,0.65),0_0_48px_rgba(57,255,20,0.3),0_6px_14px_rgba(0,0,0,0.45)] transition-shadow duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg
            viewBox="0 0 48 48"
            className="w-5 h-5"
            fill="black"
            aria-hidden
          >
            <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
          </svg>
        )}
        Dress up with Google
      </button>
    </>
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="kit-top-accent" aria-hidden />

      {/* Error toast — top of screen, auto-expires */}
      <Toast
        open={toastOpen}
        message={toastMessage}
        variant="error"
        onClose={() => setToastOpen(false)}
      />

      {/* Unified split-screen layout — same on mobile and desktop */}
      <div className="relative z-20 flex-1 grid grid-rows-2">
        {/* Top half — logo descends from middle of half (scale 0.9) to bottom of
            half (scale 1). Padded so it doesn't touch the dividing line. */}
        <div className="flex justify-center items-end px-8 pb-12">
          <motion.div
            initial={{ y: "-25vh", scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: LOGO_FADE, ease: EASE_OUT_QUART }}
            className="w-[320px]"
          >
            <IDripLogoSvg
              wobble={isButtonHovered}
              className="w-full select-none pointer-events-none"
            />
          </motion.div>
        </div>

        {/* Bottom half — button rises from middle to top concurrently with the logo
            animation. Cycle text fills the gap above the footer. */}
        <div className="flex flex-col items-center px-8 pt-12 pb-24">
          <motion.div
            initial={{ y: "25vh", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: LOGO_FADE, ease: EASE_OUT_QUART }}
            className="flex flex-col items-center gap-5 w-[320px]"
          >
            {authContent}
          </motion.div>

          {entered && (
            <motion.div
              className="flex-1 mt-15 flex items-center w-[320px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                opacity: { duration: LOGO_FADE, ease: EASE_OUT_QUART }
              }}
            >
              <p
                className="text-4xl leading-tight text-center w-full font-sans"
              >
                <span className="text-foreground font-bold">Style </span>
                <AnimatedTextCycle words={CYCLE_WORDS} interval={2000} />
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer — pinned absolutely to the bottom on all viewports */}
      {entered && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: FADE_IN, ease: EASE_OUT_QUART }}
          className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-6 md:pb-6 mb-3 md:mb-0 safe-area-bottom text-fine-print text-foreground/50 text-center max-w-md mx-auto"
        >
          By continuing you agree to the Terms of Service and Privacy Policy.
        </motion.p>
      )}
    </div>
  );
}

type BrandMarkVariant = "essential" | "orbit" | "signature";

type BrandLogoProps = {
  variant?: BrandMarkVariant;
  size?: number;
  showWordmark?: boolean;
  tone?: "light" | "dark";
};

function MarkArtwork({ variant }: { variant: BrandMarkVariant }) {
  if (variant === "essential") {
    return (
      <>
        <defs>
          <linearGradient id="essential-ring" x1="14" y1="12" x2="51" y2="54">
            <stop stopColor="#8BD3FF" />
            <stop offset="0.34" stopColor="#2C8ED0" />
            <stop offset="0.72" stopColor="#0B467C" />
            <stop offset="1" stopColor="#041C35" />
          </linearGradient>
        </defs>
        <circle
          cx="32"
          cy="32"
          r="22"
          fill="none"
          stroke="url(#essential-ring)"
          strokeDasharray="134 4.2"
          strokeLinecap="butt"
          strokeWidth="8"
          transform="rotate(-47 32 32)"
        />
        <path d="M11.8 39.8l5.2-2.1M13.3 43.5l5.1-2.1M15.4 47l4.8-2" stroke="#5BADE4" strokeLinecap="round" strokeWidth="1.2" />
        <path d="M17.5 17.8A20 20 0 0 1 29 12.3" fill="none" stroke="#B7E3FF" strokeLinecap="round" strokeWidth="1.2" opacity=".75" />
      </>
    );
  }

  if (variant === "orbit") {
    return (
      <>
        <defs>
          <linearGradient id="orbit-ring" x1="15" y1="13" x2="49" y2="52">
            <stop stopColor="#55C7E8" />
            <stop offset="0.52" stopColor="#118CB7" />
            <stop offset="1" stopColor="#064064" />
          </linearGradient>
        </defs>
        <path d="M17.5 18.5A22 22 0 1 0 46.5 18.5" fill="none" stroke="url(#orbit-ring)" strokeLinecap="round" strokeWidth="9" />
        <path d="M22 32A10 10 0 1 1 39.5 38.5" fill="none" stroke="#8FE4F5" strokeLinecap="round" strokeWidth="2.2" />
        <circle cx="22" cy="32" r="2.7" fill="#E9FBFF" />
        <circle cx="34.5" cy="22.5" r="2.7" fill="#E9FBFF" />
        <circle cx="39.5" cy="38.5" r="2.7" fill="#E9FBFF" />
      </>
    );
  }

  return (
    <>
      <defs>
        <linearGradient id="signature-ring" x1="14" y1="13" x2="50" y2="53">
          <stop stopColor="#91D5FF" />
          <stop offset="0.4" stopColor="#3D91D4" />
          <stop offset="1" stopColor="#071E46" />
        </linearGradient>
      </defs>
      <path d="M17.5 18A22.5 22.5 0 1 0 47 18" fill="none" stroke="url(#signature-ring)" strokeLinecap="round" strokeWidth="10" />
      <path d="M23 31.5A10.5 10.5 0 0 1 28 22.5" fill="none" stroke="#9FD8FF" strokeLinecap="round" strokeWidth="2" />
      <path d="M41 29.5A10.5 10.5 0 0 0 37.5 23" fill="none" stroke="#C7E9FF" strokeLinecap="round" strokeWidth="2" />
      <path d="M25.5 40A10.5 10.5 0 0 0 34 42.5" fill="none" stroke="#DDF2FF" strokeLinecap="round" strokeWidth="2" />
      <circle cx="28" cy="22.5" r="2.2" fill="#8DCFFF" />
      <circle cx="37.5" cy="23" r="2.2" fill="#8DCFFF" />
      <circle cx="25.5" cy="40" r="2.2" fill="#67B7EE" />
    </>
  );
}

export function BrandLogo({
  variant = "essential",
  size = 40,
  showWordmark = false,
  tone = "dark",
}: BrandLogoProps) {
  const wordmarkColor = tone === "light" ? "text-white" : "text-[#071b2a]";

  return (
    <span className="inline-flex items-center gap-3">
      <span
        className="inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg aria-hidden="true" viewBox="0 0 64 64" className="size-full drop-shadow-[0_8px_16px_rgba(16,105,165,0.18)]">
          <MarkArtwork variant={variant} />
        </svg>
      </span>
      {showWordmark && (
        <span className={`leading-none ${wordmarkColor}`}>
          <span className="block text-lg font-semibold">
            orquestra<span className="text-[#5bb9eb]">.cs</span>
          </span>
          <span className="mt-1 block text-[8px] font-medium uppercase tracking-[0.16em] text-[#8fb6cf]">
            Um portal para sua operação
          </span>
        </span>
      )}
    </span>
  );
}

export type { BrandMarkVariant };

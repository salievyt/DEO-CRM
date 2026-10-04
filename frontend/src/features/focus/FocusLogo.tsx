import Image from "next/image";

export function FocusLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <Image
      src="/images/DEO_FOCUS_LOGO.svg"
      alt="DEO Focus"
      width={757}
      height={128}
      className={className}
    />
  );
}

import type { SVGProps } from "react";

// Small line icons (24px grid, 1.8 stroke), drawn here instead of a library.
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {children}
    </svg>
  );
}

export const icons = {
  overview: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <rect x="3" y="3" width="7.5" height="9" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="2" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="2" />
      <rect x="3" y="15" width="7.5" height="6" rx="2" />
    </Icon>
  ),
  reports: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5V12l6 6" />
    </Icon>
  ),
  cvs: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Icon>
  ),
  jobs: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8.5 7V5.5A2 2 0 0 1 10.5 3.5h3a2 2 0 0 1 2 2V7M3 12.5h18" />
    </Icon>
  ),
  applications: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <path d="M9 5h11M9 12h11M9 19h11" />
      <path d="m3.5 5 1.2 1.2L7 4M3.5 12l1.2 1.2L7 11" />
      <circle cx="5" cy="19" r="1.3" />
    </Icon>
  ),
  logout: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4" />
    </Icon>
  ),
  arrow: (p: SVGProps<SVGSVGElement>) => (
    <Icon {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  ),
};

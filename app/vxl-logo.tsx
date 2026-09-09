export function VxlPortalMark({ className = "", decorative = false }: { className?: string; decorative?: boolean }) {
  return <span className={`vxl-portal-mark ${className}`} aria-hidden={decorative || undefined}><span className="vxl-portal-outer"/><span className="vxl-portal-inner"/><span className="vxl-portal-infinity">∞</span></span>;
}

export function VxlLogo({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return <span className={`vxl-logo ${className}`} aria-label="VXL"><VxlPortalMark decorative/>{compact ? null : <span className="vxl-wordmark">VXL</span>}</span>;
}

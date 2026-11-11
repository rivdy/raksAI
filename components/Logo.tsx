import Image from 'next/image';

/** Original supplied RUAIX artwork, framed without modifying the image. */
export function Logo({ dark = true }: { dark?: boolean }) {
  return <div className={`ruaix-logo${dark ? ' ruaix-logo-on-dark' : ''}`}>
    <div className="ruaix-logo-window">
      <Image src="/brand/ruaix-logo.png" alt="RUAIX" width={1920} height={1080} unoptimized className="ruaix-logo-image" />
    </div>
  </div>;
}

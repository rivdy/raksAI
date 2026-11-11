import Image from 'next/image';

/** Transparent RUAIX artwork; dark surfaces use a white display treatment. */
export function Logo({ dark = true }: { dark?: boolean }) {
  return <div className={`ruaix-logo${dark ? ' ruaix-logo-on-dark' : ''}`}>
    <div className="ruaix-logo-window">
      <Image src="/brand/ruaix-logo-transparent.png" alt="RUAIX" width={1672} height={941} unoptimized className="ruaix-logo-image" />
    </div>
  </div>;
}

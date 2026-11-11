# RUAIX visual identity

Source: user-supplied `ruaix no.png` (1920 x 1080), copied unchanged to `public/brand/ruaix-logo.png`.
The palette below is derived from the logo, not a separately supplied brand manual.

- Navy #002F6A: primary brand color, headings, sidebar and simulation panels.
- Blue #064783: primary actions; hover #002656.
- Mint #3CC2AE: airflow, chart highlights and accents. Avoid small mint text on white.
- Background #F5F8FC; white surface; border #D9E4F0.
- Secondary text #4C6079 on light surfaces; #C7D9ED on dark surfaces.
- Existing green/amber/red status colors remain distinct from brand colors.
- Typography: locally bundled IBM Plex Sans.
- CSS tokens: app/brand.css; matching Tailwind palette: tailwind.config.ts.
- Logo: components/Logo.tsx frames the original image via CSS to omit its large margins. White backing preserves readability on dark surfaces.
- Favicon: app/icon.svg frames the original emblem; no shield placeholder remains in the displayed identity.
- Reduced-motion and pause controls remain available. Airflow is an illustration, not sensor evidence.

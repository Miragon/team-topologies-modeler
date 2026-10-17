/**
 * Subtle legal-notice line, bottom-left. The operator (Miragon GmbH) hosts the demo, so the app
 * links out to the existing legal pages on miragon.io instead of duplicating any legal text.
 */

const LEGAL_LINKS = [
  { href: "https://miragon.io/impressum/", label: "Impressum" },
  { href: "https://miragon.io/datenschutz/", label: "Datenschutz" },
  { href: "https://github.com/Miragon/team-topologies-modeler", label: "GitHub" },
];

export function LegalNotice() {
  const year = new Date().getFullYear();
  return (
    <footer className="tt-legal" aria-label="Legal notice">
      <a href="https://miragon.io/" target="_blank" rel="noopener noreferrer">
        © {year} Miragon GmbH
      </a>
      {LEGAL_LINKS.map((link) => (
        <span className="tt-legal__item" key={link.href}>
          <span className="tt-legal__sep" aria-hidden="true">
            ·
          </span>
          <a href={link.href} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        </span>
      ))}
    </footer>
  );
}

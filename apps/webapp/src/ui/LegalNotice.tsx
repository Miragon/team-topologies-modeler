/**
 * Subtle legal-notice footer. The operator
 * (Miragon GmbH) hosts the demo, so the deployed app links out to the existing
 * legal pages on miragon.io — no legal text is duplicated/maintained here.
 */

export function LegalNotice() {
  const year = new Date().getFullYear();
  return (
    <footer className="tt-legal" aria-label="Legal">
      <a href="https://miragon.io/" target="_blank" rel="noopener noreferrer">
        © {year} Miragon GmbH
      </a>
      <span aria-hidden="true">·</span>
      <a href="https://miragon.io/impressum/" target="_blank" rel="noopener noreferrer">
        Impressum
      </a>
      <span aria-hidden="true">·</span>
      <a href="https://miragon.io/datenschutz/" target="_blank" rel="noopener noreferrer">
        Datenschutz
      </a>
      <span aria-hidden="true">·</span>
      <a
        href="https://github.com/Miragon/team-topologies-modeler"
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
      </a>
    </footer>
  );
}

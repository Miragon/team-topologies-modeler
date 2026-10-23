import { expect, type Page } from "@playwright/test";

/** The canvas's in-place label editor (TtLabelEditing). */
const LABEL_EDITOR = "textarea.tt-label-editor";

/** Every call types a name no team holds yet, so the user's commit afterwards always changes it. */
let typedNames = 0;

/** The centre of the first team a pointer reaches there, not covered by chrome or another element. */
function reachableTeamCentre(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const teams = document.querySelectorAll('.djs-container .djs-shape[data-element-id^="team_"]');
    for (const team of teams) {
      const box = team.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (hit && team.contains(hit)) return { x, y };
    }
    return null;
  });
}

/**
 * Opens the label editor the way a user does, with a double-click on a team, and types a new name
 * over the selected one without committing it; resolves with the typed name once the focused editor
 * holds it (the `labelEditor.open` hook of the modeler shell's conformance kit).
 */
export async function typeIntoLabelEditor(page: Page): Promise<string> {
  const centre = await reachableTeamCentre(page);
  if (!centre) throw new Error("the canvas shows no team a pointer reaches to double-click");
  await page.mouse.dblclick(centre.x, centre.y);
  const editor = page.locator(LABEL_EDITOR);
  await expect(editor).toBeFocused();
  typedNames += 1;
  const typed = `Renamed team ${typedNames}`;
  await page.keyboard.type(typed);
  await expect(editor).toHaveValue(typed);
  return typed;
}

/**
 * App-wide file drop (guide §9 "Drag-over"): dragging a file over the window shows a dashed blue
 * frame with "Drop file to open", and dropping it opens the file through the same checks and
 * confirmation as Menu › Open. Only drags that carry files count, so the palette's own drags and
 * text drags into the label editor are left alone.
 */

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Icon } from "@miragon/team-topologies-ui";
import { useModeler } from "@/state/modelerContext";
import { openDocumentFile } from "@/state/replace";
import { isDialogOpen } from "./uiStore";

function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export function DropZone() {
  const { modeler } = useModeler();
  const [active, setActive] = useState(false);

  useEffect(() => {
    // dragenter/dragleave fire for every element crossed, so only the outermost pair counts.
    let depth = 0;

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth += 1;
      if (!isDialogOpen()) setActive(true);
    };

    // Without preventDefault on dragover and drop the browser opens the file and leaves the app.
    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = isDialogOpen() ? "none" : "copy";
    };

    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setActive(false);
    };

    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setActive(false);
      if (isDialogOpen()) return;
      const file = event.dataTransfer?.files[0];
      if (file) void openDocumentFile(modeler, file);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [modeler]);

  if (!active) return null;

  return (
    <div className="tt-dropzone" aria-hidden="true">
      <span className="tt-dropzone__label">
        <Icon icon={Upload} />
        Drop file to open
      </span>
    </div>
  );
}

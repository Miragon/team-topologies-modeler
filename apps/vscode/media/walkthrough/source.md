# Open the source to the side

A Team Topologies diagram is a plain JSON file (`.tt` or `.ttm.json`), so Git diffs, reviews and
search work on it like on any other text.

- **Open Source to the Side** (the file icon in the editor title of the diagram) opens the JSON in
  the text editor next to the canvas.
- **Open Diagram to the Side** (the preview icon in the editor title of the text editor) does the
  reverse.

Both stay in sync: a change on the canvas is one edit in the text, and Cmd/Ctrl+Z undoes it in
either. While the text is no valid diagram, the canvas shows the last valid version and stays
read-only until you fix the text; the Problems view says what is wrong.

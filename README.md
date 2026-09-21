# Space-Colonization

Space-Colonization is an interactive generative design and architectural section tool that models branching spatial growth networks based on the space colonization algorithm. Built with high-performance vanilla JavaScript and HTML5 Canvas, it allows architects and designers to sketch custom solid/void boundaries, define growth root nodes, analyze raster sketches, and synthesize procedural 2D section morphologies with full export capabilities to CAD and 3D modeling environments.

## Features

- **Space Colonization Engine**: Simulates generative branching based on attractor point distribution, customizable influence distance, kill radius, and tropism bias.
- **Curvilinear & Rectilinear Morphology**: Dynamically adjust branch smoothness or enforce orthogonal rectilinear snapping for architectural section layouts.
- **Closed Venation & Anastomosis**: Generate secondary interconnecting loops between branches to model structural cross-bracing and spatial circulation networks.
- **Raster Sketch Analyzer**: Upload sketches or conceptual diagrams to automatically extract solid vs. void regions and generate attractor fields.
- **Procedural Variation Engine**: Explore automated morphological variations across multiple seed distributions and parameter configurations.
- **Multi-Format CAD/3D Export**: Export simulations directly to Scalable Vector Graphics (SVG), AutoCAD DXF line drawings, or Rhino 3D wavefront OBJ quad cylinder meshes.

## Getting Started

1. Clone or download the repository to your local machine.
2. Launch the application:
   - **Direct Browser**: Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).
   - **Local Server**: Run the included PowerShell development server:
     ```powershell
     powershell -ExecutionPolicy Bypass -File .\server.ps1
     ```
   - Open [http://localhost:5500/](http://localhost:5500/) in your browser.

## Controls

### Viewport Navigation
- **Pan Viewport**: Click and drag on empty canvas space.
- **Zoom Viewport**: Use the mouse scroll wheel.
- **Reset View**: Click the view reset button or double-click to center on geometry.

### Drawing & Authoring Tools
- **Select (V)**: Select, move, and transform existing boundary shapes and attractors.
- **Rectangle (R)**: Draw rectangular attractor boundary zones.
- **Circle (C)**: Draw circular attractor boundary zones.
- **Point (P)**: Manually place individual attractor points on the canvas.
- **Root Node**: Place starting seeds/roots from which branching structures originate.
- **Erase (E)**: Remove shapes, attractors, or roots.

### Simulation & Playback
- **Play / Pause**: Toggle continuous algorithmic branch growth.
- **Step**: Advance the colonization simulation by a single iteration.
- **Reset**: Clear grown branches while preserving attractor points and root positions.
- **Undo / Redo**: `Ctrl+Z` to undo and `Ctrl+Shift+Z` to redo changes.

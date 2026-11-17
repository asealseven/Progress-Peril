import type Phaser from 'phaser';
import { PALETTE, hexToNumber } from '../data/palette';
import { DISCIPLINES, RESEARCH_NODES } from '../data/research';
import type { ResearchNodeDef } from '../data/research';
import type { Discipline } from '../data/weapons';
import type { NodeState } from '../sim/research';
import { addText } from './text';

/** Sector colours for the five disciplines (NOTES.md, GDD 15.8). */
export const DISCIPLINE_COLOURS: Readonly<Record<Discipline, string>> = {
  Chemistry: '#4FA34A',
  Physics: '#D9B93A',
  Mathematics: '#6E4FA3',
  Engineering: '#C77A3A',
  Biology: '#C24A9A',
};

const RING_RADIUS = { Centre: 120, Inner: 205, Middle: 290, Outer: 375, Cross: 465, Hidden: 590 } as const;
const NODE_RADIUS = { Centre: 17, Inner: 15, Middle: 15, Outer: 17, Cross: 16, Hidden: 16 } as const;
const SECTOR = 360 / DISCIPLINES.length;
const SECTOR_MARGIN = 7;
/** The web's outer edge, in web units. */
export const WEB_RADIUS = RING_RADIUS.Hidden + 50;
const FIT_RADIUS = RING_RADIUS.Cross + 80;
const TITLE_RADIUS = RING_RADIUS.Cross + 50;
export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 2.2;
const LABEL_ZOOM = 0.85;

const INK = hexToNumber(PALETTE.ink);
const PARCHMENT = hexToNumber(PALETTE.parchment);
const BRASS = hexToNumber(PALETTE.brass);
const GOLD = hexToNumber(PALETTE.playerEffects);
const DANGER = hexToNumber(PALETTE.danger);
const GREY = 0xb9b0a0;

const radians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Sector order around the circle. Every neighbouring pair shares two cross nodes,
 * so most cross nodes sit on the border of their two sectors (NOTES.md, GDD 15.8).
 */
const SECTOR_ORDER: readonly Discipline[] = ['Chemistry', 'Engineering', 'Biology', 'Physics', 'Mathematics'];

/** The middle angle of a discipline's sector, in degrees. The first sector points up. */
function sectorCentre(discipline: Discipline): number {
  return -90 + SECTOR_ORDER.indexOf(discipline) * SECTOR;
}

/** The mean direction of several disciplines, in degrees. */
function meanAngle(disciplines: readonly Discipline[]): number {
  let x = 0;
  let y = 0;
  for (const discipline of disciplines) {
    x += Math.cos(radians(sectorCentre(discipline)));
    y += Math.sin(radians(sectorCentre(discipline)));
  }
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** Spreads angles around a circle so neighbours keep a minimum gap. */
function spread(entries: Array<{ node: ResearchNodeDef; angle: number }>, gap: number): void {
  entries.sort((a, b) => a.angle - b.angle);
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let index = 0; index < entries.length; index++) {
      const a = entries[index];
      const b = entries[(index + 1) % entries.length];
      if (!a || !b || a === b) continue;
      const wrap = index === entries.length - 1 ? 360 : 0;
      const distance = b.angle + wrap - a.angle;
      if (distance < gap) {
        const push = (gap - distance) / 2;
        a.angle -= push;
        b.angle += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
}

export interface WebPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Where every node sits on the web (GDD 15.8): five sectors with four rings,
 * cross nodes on a band outside the rings near the border of their disciplines,
 * hidden nodes on the outermost band and The Philosopher's Engine at the centre.
 */
export function layoutResearchWeb(): ReadonlyMap<string, WebPoint> {
  const points = new Map<string, WebPoint>();
  const place = (node: ResearchNodeDef, angle: number, radius: number): void => {
    points.set(node.id, { x: Math.cos(radians(angle)) * radius, y: Math.sin(radians(angle)) * radius });
  };

  const angles = new Map<string, number>();
  for (const discipline of DISCIPLINES) {
    for (const ring of ['Centre', 'Inner', 'Middle', 'Outer'] as const) {
      // Each node sits near the mean angle of its requirements, so links stay short.
      const nodes = RESEARCH_NODES.filter((node) => node.ring === ring && node.disciplines[0] === discipline)
        .map((node, index) => {
          const parents = node.requires.map((name) => angles.get(name)).filter((angle) => angle !== undefined);
          const pull = parents.length > 0 ? parents.reduce((sum, angle) => sum + angle, 0) / parents.length : index;
          return { node, pull: pull + index * 0.001 };
        })
        .sort((a, b) => a.pull - b.pull);
      const start = sectorCentre(discipline) - SECTOR / 2 + SECTOR_MARGIN;
      const span = SECTOR - SECTOR_MARGIN * 2;
      nodes.forEach(({ node }, index) => {
        const angle = start + ((index + 0.5) * span) / nodes.length;
        angles.set(node.name, angle);
        place(node, angle, RING_RADIUS[ring]);
      });
    }
  }

  for (const ring of ['Cross', 'Hidden'] as const) {
    const entries = RESEARCH_NODES.filter((node) => node.ring === ring && node.disciplines.length < DISCIPLINES.length).map(
      (node) => ({ node, angle: meanAngle(node.disciplines) }),
    );
    spread(entries, ring === 'Cross' ? 15 : 13);
    for (const entry of entries) place(entry.node, entry.angle, RING_RADIUS[ring]);
  }
  for (const node of RESEARCH_NODES) if (!points.has(node.id)) points.set(node.id, { x: 0, y: 0 });
  return points;
}

export interface WebCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface WebViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The camera showing the whole web inside a viewport. */
export function fitCamera(viewport: WebViewport): WebCamera {
  // Fits the rings, the cross band and the discipline titles. Hidden smudges sit at the edge.
  const zoom = Math.min(viewport.width, viewport.height) / (FIT_RADIUS * 2);
  return { x: 0, y: 0, zoom };
}

export interface ResearchWebOptions {
  readonly viewport: WebViewport;
  readonly camera: WebCamera;
  readonly stateOf: (node: ResearchNodeDef) => NodeState;
  readonly hinted: (node: ResearchNodeDef) => boolean;
  /** Nodes on offer as captured research. */
  readonly captures: ReadonlySet<string>;
  readonly selected?: string;
  readonly onPick: (node: ResearchNodeDef) => void;
}

/**
 * The research web (GDD 15.8). Draws into one container. Drag pans, the wheel
 * and a two-finger pinch zoom. Panning and zooming move the container with no redraw.
 */
export class ResearchWeb {
  readonly container: Phaser.GameObjects.Container;
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly camera: WebCamera;
  private readonly viewport: WebViewport;
  private dragged = false;
  private dragFrom: { x: number; y: number; cameraX: number; cameraY: number } | undefined;
  private pinch: { distance: number; zoom: number } | undefined;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: ResearchWebOptions,
  ) {
    this.camera = options.camera;
    this.viewport = options.viewport;
    this.container = scene.add.container(0, 0);
    this.draw();
    this.apply();
    this.bindInput();
  }

  private inViewport(x: number, y: number): boolean {
    const view = this.viewport;
    return x >= view.x && x <= view.x + view.width && y >= view.y && y <= view.y + view.height;
  }

  /** Moves the container to match the camera. */
  private apply(): void {
    const view = this.viewport;
    const camera = this.camera;
    const limit = WEB_RADIUS;
    camera.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom));
    camera.x = Math.min(limit, Math.max(-limit, camera.x));
    camera.y = Math.min(limit, Math.max(-limit, camera.y));
    this.container.setScale(camera.zoom);
    this.container.setPosition(
      view.x + view.width / 2 - camera.x * camera.zoom,
      view.y + view.height / 2 - camera.y * camera.zoom,
    );
    const showLabels = camera.zoom >= LABEL_ZOOM;
    for (const label of this.labels) {
      const always = label.getData('always') === true;
      label.setVisible(showLabels || always);
      // The picked node's name stays readable at any zoom.
      label.setScale(always ? Math.max(1, LABEL_ZOOM / camera.zoom) : 1);
    }
  }

  /** Zooms about a screen point, so the web under the pointer stays in place. */
  zoomAt(screenX: number, screenY: number, zoom: number): void {
    const view = this.viewport;
    const camera = this.camera;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    const offsetX = screenX - (view.x + view.width / 2);
    const offsetY = screenY - (view.y + view.height / 2);
    camera.x += offsetX / camera.zoom - offsetX / next;
    camera.y += offsetY / camera.zoom - offsetY / next;
    camera.zoom = next;
    this.apply();
  }

  zoomBy(factor: number): void {
    const view = this.viewport;
    this.zoomAt(view.x + view.width / 2, view.y + view.height / 2, this.camera.zoom * factor);
  }

  reset(): void {
    Object.assign(this.camera, fitCamera(this.viewport));
    this.apply();
  }

  private bindInput(): void {
    const input = this.scene.input;
    const touches = (): Phaser.Input.Pointer[] => input.manager.pointers.filter((pointer) => pointer.isDown);

    const onDown = (pointer: Phaser.Input.Pointer): void => {
      if (!this.inViewport(pointer.x, pointer.y)) return;
      const down = touches();
      const [first, second] = down;
      if (down.length >= 2 && first && second) {
        this.pinch = { distance: Math.hypot(first.x - second.x, first.y - second.y), zoom: this.camera.zoom };
        this.dragFrom = undefined;
        this.dragged = true;
        return;
      }
      this.dragged = false;
      this.dragFrom = { x: pointer.x, y: pointer.y, cameraX: this.camera.x, cameraY: this.camera.y };
    };
    const onMove = (pointer: Phaser.Input.Pointer): void => {
      const down = touches();
      const [first, second] = down;
      if (this.pinch && down.length >= 2 && first && second) {
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        if (this.pinch.distance > 0) {
          this.zoomAt((first.x + second.x) / 2, (first.y + second.y) / 2, (this.pinch.zoom * distance) / this.pinch.distance);
        }
        return;
      }
      const from = this.dragFrom;
      if (!from || !pointer.isDown) return;
      const dx = pointer.x - from.x;
      const dy = pointer.y - from.y;
      if (!this.dragged && Math.hypot(dx, dy) < 8) return;
      this.dragged = true;
      this.camera.x = from.cameraX - dx / this.camera.zoom;
      this.camera.y = from.cameraY - dy / this.camera.zoom;
      this.apply();
    };
    const onUp = (): void => {
      if (touches().length < 2) this.pinch = undefined;
      this.dragFrom = undefined;
    };
    const onWheel = (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number): void => {
      if (!this.inViewport(pointer.x, pointer.y)) return;
      this.zoomAt(pointer.x, pointer.y, this.camera.zoom * (dy > 0 ? 0.88 : 1 / 0.88));
    };
    input.on('pointerdown', onDown);
    input.on('pointermove', onMove);
    input.on('pointerup', onUp);
    input.on('wheel', onWheel);
    this.scene.events.once('shutdown', () => {
      input.off('pointerdown', onDown);
      input.off('pointermove', onMove);
      input.off('pointerup', onUp);
      input.off('wheel', onWheel);
    });
  }

  private draw(): void {
    const scene = this.scene;
    const options = this.options;
    const points = layoutResearchWeb();
    const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
      this.container.add(object);
      return object;
    };

    // Sectors: one coloured slice per discipline, with ring guides.
    const base = add(scene.add.graphics());
    const edge = RING_RADIUS.Outer + 45;
    for (const discipline of DISCIPLINES) {
      const centre = sectorCentre(discipline);
      const colour = hexToNumber(DISCIPLINE_COLOURS[discipline]);
      base.fillStyle(colour, 0.16);
      base.slice(0, 0, edge, radians(centre - SECTOR / 2), radians(centre + SECTOR / 2), false);
      base.fillPath();
      base.lineStyle(2, INK, 0.35);
      const border = radians(centre - SECTOR / 2);
      base.lineBetween(Math.cos(border) * 60, Math.sin(border) * 60, Math.cos(border) * edge, Math.sin(border) * edge);
      // Titles sit outside the cross band, between its nodes, level for reading.
      const title = add(
        addText(scene, Math.cos(radians(centre)) * TITLE_RADIUS, Math.sin(radians(centre)) * TITLE_RADIUS, discipline, {
          role: 'heading',
          size: 34,
          colour: DISCIPLINE_COLOURS[discipline],
        }).setOrigin(0.5),
      );
      title.setStroke(PALETTE.ink, 2);
    }
    base.lineStyle(1, INK, 0.18);
    for (const ring of ['Centre', 'Inner', 'Middle', 'Outer'] as const) base.strokeCircle(0, 0, RING_RADIUS[ring]);
    base.lineStyle(2, INK, 0.35);
    base.strokeCircle(0, 0, edge);

    const visible = (node: ResearchNodeDef): boolean => options.stateOf(node) !== 'undiscovered';

    // Linking lines from each requirement to the node.
    const links = add(scene.add.graphics());
    for (const node of RESEARCH_NODES) {
      if (!visible(node)) continue;
      const to = points.get(node.id);
      const state = options.stateOf(node);
      for (const name of node.requires) {
        const required = RESEARCH_NODES.find((other) => other.name === name);
        const from = required ? points.get(required.id) : undefined;
        if (!required || !from || !to) continue;
        const done = options.stateOf(required) === 'researched';
        const picked = options.selected === node.id || options.selected === required.id;
        if (picked) links.lineStyle(4, GOLD, 0.95);
        else if (state === 'researched') links.lineStyle(3, INK, 0.8);
        else if (done) links.lineStyle(2, INK, 0.45);
        else links.lineStyle(2, GREY, 0.75);
        links.lineBetween(from.x, from.y, to.x, to.y);
      }
    }

    for (const node of RESEARCH_NODES) {
      const point = points.get(node.id);
      if (!point) continue;
      const state = options.stateOf(node);
      const radius = NODE_RADIUS[node.ring];
      const shape = add(scene.add.graphics());
      const picked = options.selected === node.id;

      if (state === 'undiscovered') {
        if (!options.hinted(node)) continue;
        // An ink smudge marks a hidden node with a hint (GDD 8.12).
        shape.fillStyle(INK, 0.35);
        shape.fillEllipse(point.x - 4, point.y + 2, radius * 2.4, radius * 1.5);
        shape.fillStyle(INK, 0.5);
        shape.fillEllipse(point.x + 5, point.y - 3, radius * 1.5, radius * 1.9);
        shape.fillStyle(INK, 0.7);
        shape.fillCircle(point.x, point.y, radius * 0.6);
      } else {
        const colours = node.disciplines.map((discipline) => hexToNumber(DISCIPLINE_COLOURS[discipline]));
        if (state === 'available') {
          const glow = add(scene.add.circle(point.x, point.y, radius + 9, GOLD, 0.45));
          this.container.sendToBack(glow);
          this.container.bringToTop(shape);
          scene.tweens.add({ targets: glow, alpha: 0.12, scale: 1.18, duration: 900, yoyo: true, repeat: -1 });
        }
        if (state === 'researched') {
          // Filled with the discipline colours, one wedge per linked discipline.
          colours.forEach((colour, index) => {
            shape.fillStyle(colour, 1);
            const from = -Math.PI / 2 + (index * Math.PI * 2) / colours.length;
            shape.slice(point.x, point.y, radius, from, from + (Math.PI * 2) / colours.length, false);
            shape.fillPath();
          });
          shape.lineStyle(3, INK, 1);
        } else if (state === 'blocked') {
          shape.fillStyle(GREY, 0.75);
          shape.fillCircle(point.x, point.y, radius);
          shape.lineStyle(2, INK, 0.4);
        } else if (state === 'archive') {
          // Archive only: a faint page with a dashed brass outline, bought in the Grand Archive (GDD 15.8).
          shape.fillStyle(PARCHMENT, 0.55);
          shape.fillCircle(point.x, point.y, radius);
          shape.lineStyle(2.5, BRASS, 0.9);
          const dashes = 10;
          for (let dash = 0; dash < dashes; dash++) {
            const from = (dash / dashes) * Math.PI * 2;
            shape.beginPath();
            shape.arc(point.x, point.y, radius, from, from + (Math.PI / dashes) * 1.1, false);
            shape.strokePath();
          }
          shape.lineStyle(0, INK, 0);
        } else {
          shape.fillStyle(PARCHMENT, 1);
          shape.fillCircle(point.x, point.y, radius);
          shape.lineStyle(state === 'available' ? 4 : 2.5, state === 'available' ? GOLD : INK, 1);
        }
        shape.strokeCircle(point.x, point.y, radius);
        if (state !== 'researched') {
          // A small pip in the discipline colour keeps the sector readable on every state.
          colours.forEach((colour, index) => {
            shape.fillStyle(colour, state === 'blocked' || state === 'archive' ? 0.5 : 1);
            shape.fillCircle(point.x + (index - (colours.length - 1) / 2) * 7, point.y, colours.length > 2 ? 2.5 : 4);
          });
        }
        if (options.captures.has(node.id)) {
          shape.lineStyle(3, DANGER, 1);
          shape.strokeCircle(point.x, point.y, radius + 6);
        }
      }
      if (picked) {
        shape.lineStyle(3, GOLD, 1);
        shape.strokeCircle(point.x, point.y, radius + 11);
      }

      const label = add(
        addText(scene, point.x, point.y + radius + 3, state === 'undiscovered' ? '?' : node.name, {
          scalable: true,
          size: 11,
          weight: '700',
          align: 'center',
          wrapWidth: 84,
          colour: PALETTE.ink,
        }).setOrigin(0.5, 0),
      );
      label.setAlpha(state === 'blocked' ? 0.55 : state === 'archive' ? 0.6 : 1);
      label.setData('always', picked);
      this.labels.push(label);

      // A touch target of at least 44 pixels at the default zoom (GDD 15.7).
      const hit = add(scene.add.circle(point.x, point.y, Math.max(radius + 6, 24), 0xffffff, 0.001));
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (!this.dragged) options.onPick(node);
      });
    }
  }
}

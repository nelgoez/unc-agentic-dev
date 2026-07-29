import type { MoodleSection } from '../api/MoodleApiClient';
import type { CourseStructure } from '../ui/MoodleCourse';

export interface GraphNode {
  cmid: number;
  name: string;
  sectionNumber: number;
  sectionName: string;
  type: string;
  completion: number;
  isautomatic: boolean;
  visible: number;
  uservisible: boolean;
  groupmode: number;
  hasViewLink: boolean;
  href?: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  fromCmid: number;
  toCmid: number;
  type: 'completion' | 'grade' | 'group' | 'cohort' | 'date';
  requiredValue?: number;
  rawCondition?: Record<string, unknown>;
}

export interface LayerDelta {
  missingNodes: GraphNode[];
  extraNodes: GraphNode[];
  mismatchedNodes: Array<{ node: GraphNode; field: string; expected: unknown; actual: unknown }>;
  missingEdges: GraphEdge[];
  agreementScore: number;
}

export class CourseDependencyGraph {
  nodes: Map<number, GraphNode> = new Map();
  edges: GraphEdge[] = [];

  static fromAdminUI(view: CourseStructure): CourseDependencyGraph {
    const graph = new CourseDependencyGraph();
    for (const section of view.sections) {
      for (const act of section.activities) {
        const cmid = parseCmid(act.href);
        if (cmid === 0)
          continue;
        graph.nodes.set(cmid, {
          cmid,
          name: act.name,
          sectionNumber: section.number,
          sectionName: section.title,
          type: act.type,
          completion: act.hasCompletionTracking ? 1 : 0,
          isautomatic: false,
          visible: 1,
          uservisible: true,
          groupmode: 0,
          hasViewLink: !!act.href,
          href: act.href || undefined,
          metadata: {
            isComplete: act.isComplete,
            isVisible: act.isVisible,
            availabilityInfo: act.availabilityInfo,
          },
        });
      }
    }
    for (const section of view.sections) {
      if (!section.restrictionText)
        continue;
      const referencedCmids = extractCmidFromRestrictionText(section.restrictionText);
      for (const toCmid of referencedCmids) {
        const fromCmids = section.activities
          .map(a => parseCmid(a.href))
          .filter(c => c > 0 && c !== toCmid);
        for (const fromCmid of fromCmids) {
          graph.edges.push({
            fromCmid,
            toCmid,
            type: 'completion',
          });
        }
      }
    }
    return graph;
  }

  static fromStudentUI(view: CourseStructure): CourseDependencyGraph {
    const graph = new CourseDependencyGraph();
    for (const section of view.sections) {
      for (const act of section.activities) {
        const cmid = parseCmid(act.href);
        if (cmid === 0 && !act.href) {
          graph.nodes.set(hashName(section.number, act.name), {
            cmid: 0,
            name: act.name,
            sectionNumber: section.number,
            sectionName: section.title,
            type: act.type,
            completion: act.hasCompletionTracking ? 1 : 0,
            isautomatic: false,
            visible: act.isVisible ? 1 : 0,
            uservisible: act.isVisible,
            groupmode: 0,
            hasViewLink: !!act.href,
            href: act.href || undefined,
            metadata: {
              isComplete: act.isComplete,
              isVisible: act.isVisible,
              availabilityInfo: act.availabilityInfo,
            },
          });
          continue;
        }
        graph.nodes.set(cmid, {
          cmid,
          name: act.name,
          sectionNumber: section.number,
          sectionName: section.title,
          type: act.type,
          completion: act.hasCompletionTracking ? 1 : 0,
          isautomatic: false,
          visible: act.isVisible ? 1 : 0,
          uservisible: act.isVisible,
          groupmode: 0,
          hasViewLink: !!act.href,
          href: act.href || undefined,
          metadata: {
            isComplete: act.isComplete,
            isVisible: act.isVisible,
            availabilityInfo: act.availabilityInfo,
          },
        });
      }
    }
    return graph;
  }

  static fromApi(
    sections: MoodleSection[],
    conditionReferencedCmids?: Set<number>,
  ): CourseDependencyGraph {
    const graph = new CourseDependencyGraph();
    for (const section of sections) {
      for (const mod of section.modules) {
        graph.nodes.set(mod.id, {
          cmid: mod.id,
          name: mod.name,
          sectionNumber: section.section,
          sectionName: section.name,
          type: mod.modplural,
          completion: mod.completion,
          isautomatic: mod.completiondata?.isautomatic ?? false,
          visible: mod.visible,
          uservisible: mod.uservisible,
          groupmode: mod.groupmode,
          hasViewLink: !mod.noviewlink,
          href: mod.url || undefined,
          metadata: {
            instance: mod.instance,
            contextid: mod.contextid,
            hasContent: (mod.contents?.length ?? 0) > 0,
            firstContentFilename: mod.contents?.[0]?.filename,
            rawAvailability: mod.availability,
          },
        });
      }
    }
    if (conditionReferencedCmids) {
      for (const section of sections) {
        if (!section.availability || section.availability === 'null')
          continue;
        try {
          const tree = JSON.parse(section.availability);
          const conditions: Array<{ type: string; cm?: number }> = [];
          traverseAvailabilityTree(tree, conditions);
          for (const cond of conditions) {
            if (cond.type === 'completion' && cond.cm) {
              const fromNodes = section.modules.map(m => m.id).filter(id => id !== cond.cm);
              for (const fromId of fromNodes) {
                graph.edges.push({ fromCmid: fromId, toCmid: cond.cm, type: 'completion' });
              }
            }
          }
        }
        catch {
          /* skip unparseable */
        }
      }
    }
    return graph;
  }

  static fromStudentApiCompletion(
    statuses: Array<{ cmid: number; state: number; tracking: number; timecompleted: number }>,
    allModules: Array<{
      id: number;
      name: string;
      section: number;
      sectionName: string;
      modplural: string;
      completion: number;
      visible: number;
    }>,
  ): CourseDependencyGraph {
    const graph = new CourseDependencyGraph();
    const modMap = new Map(allModules.map(m => [m.id, m]));
    for (const st of statuses) {
      const mod = modMap.get(st.cmid);
      if (!mod)
        continue;
      graph.nodes.set(st.cmid, {
        cmid: st.cmid,
        name: mod.name,
        sectionNumber: mod.section,
        sectionName: mod.sectionName,
        type: mod.modplural,
        completion: mod.completion,
        isautomatic: false,
        visible: mod.visible,
        uservisible: true,
        groupmode: 0,
        hasViewLink: false,
        metadata: {
          state: st.state,
          tracking: st.tracking,
          timecompleted: st.timecompleted,
        },
      });
    }
    return graph;
  }

  overlay(other: CourseDependencyGraph): LayerDelta {
    const missingNodes: GraphNode[] = [];
    const extraNodes: GraphNode[] = [];
    const mismatchedNodes: Array<{
      node: GraphNode;
      field: string;
      expected: unknown;
      actual: unknown;
    }> = [];
    const missingEdges: GraphEdge[] = [];

    for (const [cmid, node] of this.nodes) {
      const otherNode = other.nodes.get(cmid);
      if (!otherNode) {
        missingNodes.push(node);
      }
      else {
        const fields: Array<{ field: string; a: unknown; b: unknown }> = [
          { field: 'hasViewLink', a: node.hasViewLink, b: otherNode.hasViewLink },
          { field: 'uservisible', a: node.uservisible, b: otherNode.uservisible },
          { field: 'visible', a: node.visible, b: otherNode.visible },
        ];
        for (const f of fields) {
          if (f.a !== f.b) {
            mismatchedNodes.push({ node, field: f.field, expected: f.a, actual: f.b });
          }
        }
      }
    }

    for (const [cmid] of other.nodes) {
      if (!this.nodes.has(cmid)) {
        const otherNode = other.nodes.get(cmid)!;
        extraNodes.push(otherNode);
      }
    }

    const thisEdgeSet = new Set(this.edges.map(e => `${e.fromCmid}->${e.toCmid}:${e.type}`));
    for (const edge of other.edges) {
      const key = `${edge.fromCmid}->${edge.toCmid}:${edge.type}`;
      if (!thisEdgeSet.has(key)) {
        missingEdges.push(edge);
      }
    }

    const totalFields = this.nodes.size * 3 + this.edges.length;
    const mismatches
      = mismatchedNodes.length + missingNodes.length + extraNodes.length + missingEdges.length;
    const agreementScore = totalFields > 0 ? Math.max(0, 1 - mismatches / totalFields) : 1;

    return { missingNodes, extraNodes, mismatchedNodes, missingEdges, agreementScore };
  }
}

function parseCmid(href: string): number {
  if (!href)
    return 0;
  const m = href.match(/[?&]id=(\d+)/);
  return m ? Number(m[1]) : 0;
}

function hashName(section: number, name: string): number {
  let hash = 0;
  const s = `${section}:${name}`;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function extractCmidFromRestrictionText(text: string): number[] {
  const cmids: number[] = [];
  const regex = /[?&]id=(\d+)/g;
  let match = regex.exec(text);
  while (match !== null) {
    cmids.push(Number(match[1]));
    match = regex.exec(text);
  }
  return cmids;
}

function traverseAvailabilityTree(
  node: any,
  conditions: Array<{ type: string; cm?: number }>,
): void {
  if (!node || typeof node !== 'object')
    return;
  if (node.type === 'completion' && node.cm) {
    conditions.push({ type: 'completion', cm: node.cm });
  }
  if (node.c && Array.isArray(node.c)) {
    for (const child of node.c) {
      traverseAvailabilityTree(child, conditions);
    }
  }
}

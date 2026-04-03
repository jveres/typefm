/**
 * Type declarations for idiomorph
 * @see https://github.com/bigskysoftware/idiomorph
 */

declare module 'idiomorph/dist/idiomorph.cjs.js' {
  export interface IdiomorphCallbacks {
    /** Called before a node is added. Return false to prevent. */
    beforeNodeAdded?: (node: Node) => boolean | void;
    /** Called after a node is added. */
    afterNodeAdded?: (node: Node) => void;
    /** Called before a node is morphed. Return false to prevent. */
    beforeNodeMorphed?: (oldNode: Node, newNode: Node) => boolean | void;
    /** Called after a node is morphed. */
    afterNodeMorphed?: (oldNode: Node, newNode: Node) => void;
    /** Called before a node is removed. Return false to prevent. */
    beforeNodeRemoved?: (node: Node) => boolean | void;
    /** Called after a node is removed. */
    afterNodeRemoved?: (node: Node) => void;
    /** Called before an attribute is updated. Return false to prevent. */
    beforeAttributeUpdated?: (name: string, node: Element, action: 'update' | 'remove') => boolean | void;
  }

  export interface IdiomorphOptions {
    /** How to morph: 'innerHTML' replaces children, 'outerHTML' replaces element */
    morphStyle?: 'innerHTML' | 'outerHTML';
    /** Whether to ignore active element to preserve focus */
    ignoreActive?: boolean;
    /** Whether to ignore active element value */
    ignoreActiveValue?: boolean;
    /** Lifecycle callbacks */
    callbacks?: IdiomorphCallbacks;
    /** Whether to use view transitions API */
    useViewTransition?: boolean;
  }

  export interface Idiomorph {
    /**
     * Morph an element to match new HTML content
     * @param element The element to morph
     * @param newContent The new HTML content (string or element)
     * @param options Morphing options
     */
    morph(
      element: Element,
      newContent: string | Element,
      options?: IdiomorphOptions
    ): void;
  }

  const idiomorph: Idiomorph;
  export default idiomorph;
}

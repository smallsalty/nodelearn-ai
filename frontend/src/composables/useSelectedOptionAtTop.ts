import { nextTick, onBeforeUnmount, onMounted } from "vue";

const SELECT_WRAP_SELECTOR = ".el-select-dropdown__wrap";
const SELECT_LIST_SELECTOR = ".el-select-dropdown__list";
const SELECTED_OPTION_SELECTOR = ".el-select-dropdown__item.is-selected";
const ALIGNMENT_DELAYS_MS = [0, 80, 200, 360] as const;

export function useSelectedOptionAtTop(popperClass: string, selectInputId: string) {
  let animationFrameId: number | null = null;
  let timeoutIds: number[] = [];
  let requestId = 0;
  let activeList: HTMLElement | null = null;
  let originalPaddingBottom = "";
  let expandedObserver: MutationObserver | null = null;

  function cancelScheduledAlignment() {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    for (const timeoutId of timeoutIds) {
      window.clearTimeout(timeoutId);
    }
    timeoutIds = [];
  }

  function clearScrollAllowance() {
    if (activeList) {
      activeList.style.paddingBottom = originalPaddingBottom;
    }
    activeList = null;
    originalPaddingBottom = "";
  }

  function findVisiblePopper(): HTMLElement | null {
    const poppers = Array.from(
      document.querySelectorAll<HTMLElement>(`.el-popper.${popperClass}`)
    );
    return (
      poppers.find(
        (popper) =>
          popper.getAttribute("aria-hidden") !== "true" &&
          window.getComputedStyle(popper).display !== "none"
      ) ?? null
    );
  }

  function alignSelectedOption() {
    clearScrollAllowance();
    const popper = findVisiblePopper();
    if (!popper) return;
    const wrap = popper.querySelector<HTMLElement>(SELECT_WRAP_SELECTOR);
    const list = popper.querySelector<HTMLElement>(SELECT_LIST_SELECTOR);
    if (!wrap || !list) return;

    const selectedOption = popper.querySelector<HTMLElement>(SELECTED_OPTION_SELECTOR);
    if (!selectedOption) {
      wrap.scrollTop = 0;
      return;
    }

    const wrapRect = wrap.getBoundingClientRect();
    const selectedRect = selectedOption.getBoundingClientRect();
    const selectedTop = selectedRect.top - wrapRect.top + wrap.scrollTop;
    const contentAfterSelectedTop = wrap.scrollHeight - selectedTop;
    const extraPadding = Math.max(0, wrap.clientHeight - contentAfterSelectedTop);

    if (extraPadding > 0) {
      activeList = list;
      originalPaddingBottom = list.style.paddingBottom;
      const computedPadding = Number.parseFloat(window.getComputedStyle(list).paddingBottom) || 0;
      list.style.paddingBottom = `${computedPadding + extraPadding}px`;
    }
    wrap.scrollTop = selectedTop;
  }

  function scheduleAlignment(currentRequestId: number) {
    timeoutIds = ALIGNMENT_DELAYS_MS.map((delay) =>
      window.setTimeout(() => {
        if (currentRequestId !== requestId) return;
        animationFrameId = window.requestAnimationFrame(() => {
          animationFrameId = null;
          if (currentRequestId === requestId) alignSelectedOption();
        });
      }, delay)
    );
  }

  function handleVisibleChange(visible: boolean) {
    requestId += 1;
    const currentRequestId = requestId;
    cancelScheduledAlignment();

    if (!visible) {
      void nextTick(() => {
        if (currentRequestId !== requestId) return;

        const combobox = document.getElementById(selectInputId);
        if (
          combobox?.getAttribute("aria-expanded") === "true" ||
          findVisiblePopper()
        ) {
          scheduleAlignment(currentRequestId);
          return;
        }

        clearScrollAllowance();
      });
      return;
    }

    void nextTick(() => {
      if (currentRequestId !== requestId) return;
      scheduleAlignment(currentRequestId);
    });
  }

  function observeExpandedState() {
    expandedObserver?.disconnect();
    expandedObserver = null;
    expandedObserver = new MutationObserver((mutations) => {
      const expandedMutation = mutations.find(
        (mutation) =>
          mutation.target instanceof HTMLElement && mutation.target.id === selectInputId
      );
      if (!(expandedMutation?.target instanceof HTMLElement)) return;
      handleVisibleChange(expandedMutation.target.getAttribute("aria-expanded") === "true");
    });
    expandedObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-expanded"],
      subtree: true
    });

    const combobox = document.getElementById(selectInputId);
    if (combobox?.getAttribute("aria-expanded") === "true") {
      handleVisibleChange(true);
    }
  }

  onMounted(() => {
    void nextTick(observeExpandedState);
  });

  onBeforeUnmount(() => {
    requestId += 1;
    cancelScheduledAlignment();
    clearScrollAllowance();
    expandedObserver?.disconnect();
    expandedObserver = null;
  });

  return { handleVisibleChange };
}

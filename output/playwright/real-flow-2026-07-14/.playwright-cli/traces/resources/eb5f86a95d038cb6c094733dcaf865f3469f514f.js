import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/VideoLessonPlayer.vue");import { defineComponent as _defineComponent } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
import { computed, nextTick, ref, watch } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "VideoLessonPlayer",
  props: {
    content: { type: String, required: true }
  },
  setup(__props, { expose: __expose }) {
    __expose();
    const props = __props;
    const currentSceneIndex = ref(0);
    const audioElement = ref(null);
    const autoPlay = ref(false);
    const playing = ref(false);
    const sceneProgress = ref(0);
    const lesson = computed(() => {
      try {
        const parsed = JSON.parse(props.content);
        return parsed.style === "clean_motion_graphics" && Array.isArray(parsed.scenes) ? parsed : null;
      } catch {
        return null;
      }
    });
    const steps = computed(() => (lesson.value?.scenes ?? []).flatMap((scene) => {
      if (scene.beats?.length) return scene.beats.map((beat) => ({ scene, beat }));
      if (!scene.visualPlan) return [];
      return [{
        scene,
        beat: {
          beatId: `${scene.sceneId}_legacy`,
          narration: scene.narration ?? "",
          durationSeconds: scene.durationSeconds,
          screenText: scene.screenText?.length ? scene.screenText : [scene.title],
          claims: [],
          sourceIds: [],
          visualPlan: scene.visualPlan,
          audioUrl: scene.audioUrl ?? ""
        }
      }];
    }));
    const currentStep = computed(() => steps.value[currentSceneIndex.value] ?? null);
    const currentScene = computed(() => currentStep.value?.scene ?? null);
    const currentBeat = computed(() => currentStep.value?.beat ?? null);
    const currentVisualPlan = computed(() => currentBeat.value?.visualPlan ?? null);
    const totalProgress = computed(() => {
      const sceneCount = steps.value.length;
      return sceneCount ? (currentSceneIndex.value + sceneProgress.value / 100) / sceneCount * 100 : 0;
    });
    watch(() => props.content, () => {
      currentSceneIndex.value = 0;
      sceneProgress.value = 0;
      playing.value = false;
    });
    const animationClass = (element) => `motion-${element.animation}`;
    const animationDelay = (index) => ({ animationDelay: `${index * 90}ms` });
    function previousScene() {
      if (currentSceneIndex.value > 0) {
        currentSceneIndex.value -= 1;
        void restartAudio();
      }
    }
    function nextScene() {
      const scenes = steps.value;
      if (currentSceneIndex.value < scenes.length - 1) {
        currentSceneIndex.value += 1;
        void restartAudio();
      } else {
        playing.value = false;
        sceneProgress.value = 100;
      }
    }
    async function togglePlay() {
      const audio = audioElement.value;
      if (!audio) return;
      if (audio.paused) await audio.play();
      else audio.pause();
    }
    function updateProgress() {
      const audio = audioElement.value;
      if (audio?.duration) sceneProgress.value = audio.currentTime / audio.duration * 100;
    }
    function handleEnded() {
      sceneProgress.value = 100;
      if (autoPlay.value) nextScene();
      else playing.value = false;
    }
    async function restartAudio() {
      sceneProgress.value = 0;
      await nextTick();
      const audio = audioElement.value;
      if (!audio) return;
      audio.load();
      if (autoPlay.value || playing.value) await audio.play();
    }
    const __returned__ = { props, currentSceneIndex, audioElement, autoPlay, playing, sceneProgress, lesson, steps, currentStep, currentScene, currentBeat, currentVisualPlan, totalProgress, animationClass, animationDelay, previousScene, nextScene, togglePlay, updateProgress, handleEnded, restartAudio };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle, resolveComponent as _resolveComponent, withCtx as _withCtx, createVNode as _createVNode, createBlock as _createBlock } from "/node_modules/.vite/deps/vue.js?v=19c73d71";
const _hoisted_1 = {
  key: 0,
  class: "video-lesson-player"
};
const _hoisted_2 = { class: "lesson-stage" };
const _hoisted_3 = { class: "stage-header" };
const _hoisted_4 = { class: "scene-meta" };
const _hoisted_5 = { class: "motion-stage" };
const _hoisted_6 = { class: "screen-copy" };
const _hoisted_7 = { key: 0 };
const _hoisted_8 = ["src", "alt"];
const _hoisted_9 = { class: "stage-progress" };
const _hoisted_10 = { class: "subtitle" };
const _hoisted_11 = { class: "scene-audit" };
const _hoisted_12 = { key: 0 };
const _hoisted_13 = { key: 1 };
const _hoisted_14 = { key: 2 };
const _hoisted_15 = { key: 3 };
const _hoisted_16 = {
  key: 4,
  class: "animation-step-list"
};
const _hoisted_17 = ["src"];
const _hoisted_18 = { class: "player-controls" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_el_button = _resolveComponent("el-button");
  const _component_el_checkbox = _resolveComponent("el-checkbox");
  const _component_el_alert = _resolveComponent("el-alert");
  return $setup.lesson && $setup.currentScene && $setup.currentBeat && $setup.currentVisualPlan ? (_openBlock(), _createElementBlock("section", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _createElementVNode("header", _hoisted_3, [
        _createElementVNode("div", null, [
          _cache[3] || (_cache[3] = _createElementVNode(
            "p",
            null,
            "课程讲解",
            -1
            /* CACHED */
          )),
          _createElementVNode(
            "h2",
            null,
            _toDisplayString($setup.lesson.title),
            1
            /* TEXT */
          )
        ]),
        _createElementVNode("div", _hoisted_4, [
          _createElementVNode(
            "span",
            null,
            _toDisplayString($setup.currentScene.sceneType),
            1
            /* TEXT */
          ),
          _createTextVNode(
            _toDisplayString($setup.currentSceneIndex + 1) + " / " + _toDisplayString($setup.steps.length),
            1
            /* TEXT */
          )
        ])
      ]),
      _createElementVNode("main", _hoisted_5, [
        _createElementVNode("div", _hoisted_6, [
          _createElementVNode(
            "h3",
            null,
            _toDisplayString($setup.currentBeat.screenText[0]),
            1
            /* TEXT */
          ),
          $setup.currentBeat.screenText.length > 1 ? (_openBlock(), _createElementBlock("ul", _hoisted_7, [
            (_openBlock(true), _createElementBlock(
              _Fragment,
              null,
              _renderList($setup.currentBeat.screenText.slice(1, 3), (item) => {
                return _openBlock(), _createElementBlock(
                  "li",
                  { key: item },
                  _toDisplayString(item),
                  1
                  /* TEXT */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])) : _createCommentVNode("v-if", true)
        ]),
        _createElementVNode(
          "section",
          {
            class: _normalizeClass(["visual-plan", `layout-${$setup.currentVisualPlan.layout}`])
          },
          [
            (_openBlock(true), _createElementBlock(
              _Fragment,
              null,
              _renderList($setup.currentVisualPlan.elements, (element, index) => {
                return _openBlock(), _createElementBlock(
                  _Fragment,
                  {
                    key: `${element.type}-${index}`
                  },
                  [
                    element.type === "text" || element.type === "keyword" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 0,
                        class: _normalizeClass(["motion-text", [$setup.animationClass(element), { keyword: element.type === "keyword" }]]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      _toDisplayString(element.content),
                      7
                      /* TEXT, CLASS, STYLE */
                    )) : element.type === "card" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 1,
                        class: _normalizeClass(["concept-card", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      _toDisplayString(element.content),
                      7
                      /* TEXT, CLASS, STYLE */
                    )) : element.type === "icon" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 2,
                        class: _normalizeClass(["icon-bubble", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "span",
                          null,
                          _toDisplayString(element.name),
                          1
                          /* TEXT */
                        )
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "arrow" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 3,
                        class: _normalizeClass(["arrow-flow", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "small",
                          null,
                          _toDisplayString(element.label),
                          1
                          /* TEXT */
                        ),
                        _cache[4] || (_cache[4] = _createElementVNode(
                          "span",
                          null,
                          null,
                          -1
                          /* CACHED */
                        ))
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "circle" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 4,
                        class: _normalizeClass(["circle-label", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      _toDisplayString(element.label),
                      7
                      /* TEXT, CLASS, STYLE */
                    )) : element.type === "grid" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 5,
                        class: _normalizeClass(["grid-focus", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "strong",
                          null,
                          _toDisplayString(element.label),
                          1
                          /* TEXT */
                        ),
                        _createElementVNode("div", null, [
                          (_openBlock(true), _createElementBlock(
                            _Fragment,
                            null,
                            _renderList(element.items ?? ["0", "1", "2", "3", "4", "5", "6", "7", "8"], (item, itemIndex) => {
                              return _openBlock(), _createElementBlock(
                                "span",
                                {
                                  key: `${item}-${itemIndex}`,
                                  class: _normalizeClass({ active: itemIndex === element.highlightIndex })
                                },
                                _toDisplayString(item),
                                3
                                /* TEXT, CLASS */
                              );
                            }),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ])
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "hash_table_buckets" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 6,
                        class: _normalizeClass(["data-structure hash-buckets", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "strong",
                          null,
                          _toDisplayString(element.keyLabel ?? "hash buckets"),
                          1
                          /* TEXT */
                        ),
                        _createElementVNode("div", null, [
                          (_openBlock(true), _createElementBlock(
                            _Fragment,
                            null,
                            _renderList(element.buckets, (bucket, bucketIndex) => {
                              return _openBlock(), _createElementBlock(
                                "span",
                                {
                                  key: `${bucket}-${bucketIndex}`,
                                  class: _normalizeClass({ active: bucketIndex === element.activeIndex, collision: element.collisionIndices?.includes(bucketIndex) })
                                },
                                "#" + _toDisplayString(bucket),
                                3
                                /* TEXT, CLASS */
                              );
                            }),
                            128
                            /* KEYED_FRAGMENT */
                          ))
                        ])
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "hash_function_panel" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 7,
                        class: _normalizeClass(["data-structure function-panel", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "span",
                          null,
                          _toDisplayString(element.inputKey),
                          1
                          /* TEXT */
                        ),
                        _cache[5] || (_cache[5] = _createElementVNode(
                          "b",
                          null,
                          "hash",
                          -1
                          /* CACHED */
                        )),
                        _createElementVNode(
                          "span",
                          null,
                          _toDisplayString(element.expression),
                          1
                          /* TEXT */
                        ),
                        _cache[6] || (_cache[6] = _createElementVNode(
                          "b",
                          null,
                          "=",
                          -1
                          /* CACHED */
                        )),
                        _createElementVNode(
                          "span",
                          null,
                          _toDisplayString(element.outputIndex),
                          1
                          /* TEXT */
                        )
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "collision_chain" || element.type === "linked_list_nodes" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 8,
                        class: _normalizeClass(["data-structure node-chain", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        (_openBlock(true), _createElementBlock(
                          _Fragment,
                          null,
                          _renderList(element.nodes, (node, nodeIndex) => {
                            return _openBlock(), _createElementBlock(
                              "span",
                              {
                                key: `${node}-${nodeIndex}`,
                                class: _normalizeClass({ active: nodeIndex === (element.type === "collision_chain" ? element.activeNodeIndex : element.activeIndex) })
                              },
                              _toDisplayString(node),
                              3
                              /* TEXT, CLASS */
                            );
                          }),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "array_cells" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 9,
                        class: _normalizeClass(["data-structure array-cells", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        (_openBlock(true), _createElementBlock(
                          _Fragment,
                          null,
                          _renderList(element.items, (item, itemIndex) => {
                            return _openBlock(), _createElementBlock(
                              "span",
                              {
                                key: `${item}-${itemIndex}`,
                                class: _normalizeClass({ active: element.activeIndices?.includes(itemIndex) })
                              },
                              _toDisplayString(item),
                              3
                              /* TEXT, CLASS */
                            );
                          }),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "stack_blocks" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 10,
                        class: _normalizeClass(["data-structure stack-blocks", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "strong",
                          null,
                          _toDisplayString(element.operation),
                          1
                          /* TEXT */
                        ),
                        (_openBlock(true), _createElementBlock(
                          _Fragment,
                          null,
                          _renderList(element.items, (item, itemIndex) => {
                            return _openBlock(), _createElementBlock(
                              "span",
                              {
                                key: `${item}-${itemIndex}`,
                                class: _normalizeClass({ active: itemIndex === element.activeIndex })
                              },
                              _toDisplayString(item),
                              3
                              /* TEXT, CLASS */
                            );
                          }),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "queue_line" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 11,
                        class: _normalizeClass(["data-structure queue-line", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "strong",
                          null,
                          _toDisplayString(element.operation),
                          1
                          /* TEXT */
                        ),
                        (_openBlock(true), _createElementBlock(
                          _Fragment,
                          null,
                          _renderList(element.items, (item, itemIndex) => {
                            return _openBlock(), _createElementBlock(
                              "span",
                              {
                                key: `${item}-${itemIndex}`,
                                class: _normalizeClass({ active: itemIndex === element.headIndex || itemIndex === element.tailIndex })
                              },
                              _toDisplayString(item),
                              3
                              /* TEXT, CLASS */
                            );
                          }),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "tree_node_graph" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 12,
                        class: _normalizeClass(["data-structure tree-preview", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        (_openBlock(true), _createElementBlock(
                          _Fragment,
                          null,
                          _renderList(element.nodes, (node) => {
                            return _openBlock(), _createElementBlock(
                              "span",
                              {
                                key: node,
                                class: _normalizeClass({ active: element.activePath?.includes(node) })
                              },
                              _toDisplayString(node),
                              3
                              /* TEXT, CLASS */
                            );
                          }),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "code_trace_panel" ? (_openBlock(), _createElementBlock(
                      "pre",
                      {
                        key: 13,
                        class: _normalizeClass(["code-element", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "code",
                          null,
                          _toDisplayString(element.codeLines.join("\n")),
                          1
                          /* TEXT */
                        )
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "pointer_arrow" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 14,
                        class: _normalizeClass(["data-structure pointer-preview", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "span",
                          null,
                          _toDisplayString(element.fromLabel),
                          1
                          /* TEXT */
                        ),
                        _createElementVNode(
                          "b",
                          null,
                          _toDisplayString(element.label),
                          1
                          /* TEXT */
                        ),
                        _createElementVNode(
                          "span",
                          null,
                          _toDisplayString(element.toLabel),
                          1
                          /* TEXT */
                        )
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "memory_box" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 15,
                        class: _normalizeClass(["data-structure memory-box", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "small",
                          null,
                          _toDisplayString(element.address),
                          1
                          /* TEXT */
                        ),
                        _createElementVNode(
                          "span",
                          {
                            class: _normalizeClass({ active: element.active })
                          },
                          _toDisplayString(element.value),
                          3
                          /* TEXT, CLASS */
                        )
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "complexity_chart" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 16,
                        class: _normalizeClass(["data-structure complexity-chart", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "strong",
                          null,
                          _toDisplayString(element.label),
                          1
                          /* TEXT */
                        ),
                        (_openBlock(true), _createElementBlock(
                          _Fragment,
                          null,
                          _renderList(element.items, (item, itemIndex) => {
                            return _openBlock(), _createElementBlock(
                              "span",
                              {
                                key: `${item}-${itemIndex}`,
                                class: _normalizeClass({ active: itemIndex === element.activeIndex })
                              },
                              _toDisplayString(item),
                              3
                              /* TEXT, CLASS */
                            );
                          }),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "timeline" ? (_openBlock(), _createElementBlock(
                      "ol",
                      {
                        key: 17,
                        class: _normalizeClass(["timeline-steps", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        (_openBlock(true), _createElementBlock(
                          _Fragment,
                          null,
                          _renderList(element.items, (item) => {
                            return _openBlock(), _createElementBlock(
                              "li",
                              { key: item },
                              _toDisplayString(item),
                              1
                              /* TEXT */
                            );
                          }),
                          128
                          /* KEYED_FRAGMENT */
                        ))
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "image" ? (_openBlock(), _createElementBlock("img", {
                      key: 18,
                      class: _normalizeClass(["motion-image", $setup.animationClass(element)]),
                      style: _normalizeStyle($setup.animationDelay(index)),
                      src: element.imageUrl,
                      alt: element.alt
                    }, null, 14, _hoisted_8)) : element.type === "code" ? (_openBlock(), _createElementBlock(
                      "pre",
                      {
                        key: 19,
                        class: _normalizeClass(["code-element", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      [
                        _createElementVNode(
                          "code",
                          null,
                          _toDisplayString(element.content),
                          1
                          /* TEXT */
                        )
                      ],
                      6
                      /* CLASS, STYLE */
                    )) : element.type === "formula" ? (_openBlock(), _createElementBlock(
                      "div",
                      {
                        key: 20,
                        class: _normalizeClass(["formula-element", $setup.animationClass(element)]),
                        style: _normalizeStyle($setup.animationDelay(index))
                      },
                      _toDisplayString(element.content),
                      7
                      /* TEXT, CLASS, STYLE */
                    )) : _createCommentVNode("v-if", true)
                  ],
                  64
                  /* STABLE_FRAGMENT */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ],
          2
          /* CLASS */
        )
      ]),
      _createElementVNode("div", _hoisted_9, [
        _createElementVNode(
          "span",
          {
            style: _normalizeStyle({ width: `${$setup.totalProgress}%` })
          },
          null,
          4
          /* STYLE */
        )
      ])
    ]),
    _createElementVNode("section", _hoisted_10, [
      _cache[7] || (_cache[7] = _createElementVNode(
        "strong",
        null,
        "旁白字幕",
        -1
        /* CACHED */
      )),
      _createElementVNode(
        "p",
        null,
        _toDisplayString($setup.currentBeat.narration),
        1
        /* TEXT */
      )
    ]),
    _createElementVNode("section", _hoisted_11, [
      $setup.currentScene.teachingPurpose ? (_openBlock(), _createElementBlock("div", _hoisted_12, [
        _cache[8] || (_cache[8] = _createElementVNode(
          "strong",
          null,
          "Purpose",
          -1
          /* CACHED */
        )),
        _createElementVNode(
          "span",
          null,
          _toDisplayString($setup.currentScene.teachingPurpose),
          1
          /* TEXT */
        )
      ])) : _createCommentVNode("v-if", true),
      $setup.currentScene.concreteObjects?.length ? (_openBlock(), _createElementBlock("div", _hoisted_13, [
        _cache[9] || (_cache[9] = _createElementVNode(
          "strong",
          null,
          "Objects",
          -1
          /* CACHED */
        )),
        _createElementVNode(
          "span",
          null,
          _toDisplayString($setup.currentScene.concreteObjects.join(" / ")),
          1
          /* TEXT */
        )
      ])) : _createCommentVNode("v-if", true),
      $setup.currentScene.stateChanges?.length ? (_openBlock(), _createElementBlock("div", _hoisted_14, [
        _cache[10] || (_cache[10] = _createElementVNode(
          "strong",
          null,
          "State",
          -1
          /* CACHED */
        )),
        _createElementVNode(
          "span",
          null,
          _toDisplayString($setup.currentScene.stateChanges.join(" -> ")),
          1
          /* TEXT */
        )
      ])) : _createCommentVNode("v-if", true),
      $setup.currentScene.misconceptionFix ? (_openBlock(), _createElementBlock("div", _hoisted_15, [
        _cache[11] || (_cache[11] = _createElementVNode(
          "strong",
          null,
          "Fix",
          -1
          /* CACHED */
        )),
        _createElementVNode(
          "span",
          null,
          _toDisplayString($setup.currentScene.misconceptionFix),
          1
          /* TEXT */
        )
      ])) : _createCommentVNode("v-if", true),
      $setup.currentScene.animationSteps?.length ? (_openBlock(), _createElementBlock("ol", _hoisted_16, [
        (_openBlock(true), _createElementBlock(
          _Fragment,
          null,
          _renderList($setup.currentScene.animationSteps, (step) => {
            return _openBlock(), _createElementBlock(
              "li",
              {
                key: `${step.startState}-${step.endState}`
              },
              _toDisplayString(step.startState) + " -> " + _toDisplayString(step.endState) + " / " + _toDisplayString(step.visualAction),
              1
              /* TEXT */
            );
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : _createCommentVNode("v-if", true)
    ]),
    _createElementVNode("audio", {
      ref: "audioElement",
      src: $setup.currentBeat.audioUrl,
      onTimeupdate: $setup.updateProgress,
      onEnded: $setup.handleEnded,
      onPlay: _cache[0] || (_cache[0] = ($event) => $setup.playing = true),
      onPause: _cache[1] || (_cache[1] = ($event) => $setup.playing = false)
    }, null, 40, _hoisted_17),
    _createElementVNode("footer", _hoisted_18, [
      _createVNode(_component_el_button, {
        disabled: $setup.currentSceneIndex === 0,
        onClick: $setup.previousScene
      }, {
        default: _withCtx(() => [..._cache[12] || (_cache[12] = [
          _createTextVNode(
            "上一步",
            -1
            /* CACHED */
          )
        ])]),
        _: 1
        /* STABLE */
      }, 8, ["disabled"]),
      _createVNode(_component_el_button, {
        type: "primary",
        onClick: $setup.togglePlay
      }, {
        default: _withCtx(() => [
          _createTextVNode(
            _toDisplayString($setup.playing ? "暂停" : "播放旁白"),
            1
            /* TEXT */
          )
        ]),
        _: 1
        /* STABLE */
      }),
      _createVNode(_component_el_button, {
        disabled: $setup.currentSceneIndex === $setup.steps.length - 1,
        onClick: $setup.nextScene
      }, {
        default: _withCtx(() => [..._cache[13] || (_cache[13] = [
          _createTextVNode(
            "下一步",
            -1
            /* CACHED */
          )
        ])]),
        _: 1
        /* STABLE */
      }, 8, ["disabled"]),
      _createVNode(_component_el_checkbox, {
        modelValue: $setup.autoPlay,
        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $setup.autoPlay = $event)
      }, {
        default: _withCtx(() => [..._cache[14] || (_cache[14] = [
          _createTextVNode(
            "自动播放",
            -1
            /* CACHED */
          )
        ])]),
        _: 1
        /* STABLE */
      }, 8, ["modelValue"])
    ])
  ])) : (_openBlock(), _createBlock(_component_el_alert, {
    key: 1,
    title: "视频资源 JSON 无法解析，请重新生成资源",
    type: "error",
    closable: false,
    "show-icon": ""
  }));
}
import "/src/components/VideoLessonPlayer.vue?vue&type=style&index=0&scoped=843190f5&lang.css";
_sfc_main.__hmrId = "843190f5";
typeof __VUE_HMR_RUNTIME__ !== "undefined" && __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main);
import.meta.hot.on("file-changed", ({ file }) => {
  __VUE_HMR_RUNTIME__.CHANGED_FILE = file;
});
import.meta.hot.accept((mod) => {
  if (!mod) return;
  const { default: updated, _rerender_only } = mod;
  if (_rerender_only) {
    __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render);
  } else {
    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated);
  }
});
import _export_sfc from "/@id/__x00__plugin-vue:export-helper";
export default /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-843190f5"], ["__file", "D:/firstmoney/nodelearn-ai/frontend/src/components/VideoLessonPlayer.vue"]]);

//# sourceMappingURL=data:application/json;base64,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TUFBRztBQUFBO1lBQUg7QUFBQSxZQUFHO0FBQUE7QUFBQTtBQUFBOzs7O01BQ3BGLGFBQWtEO0FBQUEsb0JBQTVCO0FBQUEsdUZBQVE7QUFBQTswQkFBRSxNQUFJO0FBQUE7WUFBSjtBQUFBLFlBQUk7QUFBQTtBQUFBO0FBQUE7Ozs7O3VCQUd4QyxhQUEyRjtBQUFBO0lBQTFFLE9BQU07QUFBQSxJQUF5QixNQUFLO0FBQUEsSUFBUyxVQUFVO0FBQUEsSUFBTztBQUFBIiwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJWaWRlb0xlc3NvblBsYXllci52dWUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdCBzZXR1cCBsYW5nPVwidHNcIj5cclxuaW1wb3J0IHsgY29tcHV0ZWQsIG5leHRUaWNrLCByZWYsIHdhdGNoIH0gZnJvbSBcInZ1ZVwiO1xyXG5pbXBvcnQgdHlwZSB7IEFuaW1hdGlvblNjcmlwdENvbnRlbnQsIFZpZGVvTGVzc29uU2NlbmUsIFZpZGVvTmFycmF0aW9uQmVhdCwgVmlzdWFsRWxlbWVudCwgVmlzdWFsUGxhbiB9IGZyb20gXCJAL3R5cGVzL3Jlc291cmNlXCI7XG5cclxuY29uc3QgcHJvcHMgPSBkZWZpbmVQcm9wczx7IGNvbnRlbnQ6IHN0cmluZyB9PigpO1xyXG5jb25zdCBjdXJyZW50U2NlbmVJbmRleCA9IHJlZigwKTtcclxuY29uc3QgYXVkaW9FbGVtZW50ID0gcmVmPEhUTUxBdWRpb0VsZW1lbnQgfCBudWxsPihudWxsKTtcclxuY29uc3QgYXV0b1BsYXkgPSByZWYoZmFsc2UpO1xyXG5jb25zdCBwbGF5aW5nID0gcmVmKGZhbHNlKTtcclxuY29uc3Qgc2NlbmVQcm9ncmVzcyA9IHJlZigwKTtcclxuXHJcbmNvbnN0IGxlc3NvbiA9IGNvbXB1dGVkPEFuaW1hdGlvblNjcmlwdENvbnRlbnQgfCBudWxsPigoKSA9PiB7XG4gIHRyeSB7XHJcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHByb3BzLmNvbnRlbnQpIGFzIEFuaW1hdGlvblNjcmlwdENvbnRlbnQ7XHJcbiAgICByZXR1cm4gcGFyc2VkLnN0eWxlID09PSBcImNsZWFuX21vdGlvbl9ncmFwaGljc1wiICYmIEFycmF5LmlzQXJyYXkocGFyc2VkLnNjZW5lcykgPyBwYXJzZWQgOiBudWxsO1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG59KTtcblxuaW50ZXJmYWNlIFBsYXllclN0ZXAgeyBzY2VuZTogVmlkZW9MZXNzb25TY2VuZTsgYmVhdDogVmlkZW9OYXJyYXRpb25CZWF0IH1cbmNvbnN0IHN0ZXBzID0gY29tcHV0ZWQ8UGxheWVyU3RlcFtdPigoKSA9PiAobGVzc29uLnZhbHVlPy5zY2VuZXMgPz8gW10pLmZsYXRNYXAoKHNjZW5lKSA9PiB7XG4gIGlmIChzY2VuZS5iZWF0cz8ubGVuZ3RoKSByZXR1cm4gc2NlbmUuYmVhdHMubWFwKChiZWF0KSA9PiAoeyBzY2VuZSwgYmVhdCB9KSk7XG4gIGlmICghc2NlbmUudmlzdWFsUGxhbikgcmV0dXJuIFtdO1xuICByZXR1cm4gW3tcbiAgICBzY2VuZSxcbiAgICBiZWF0OiB7XG4gICAgICBiZWF0SWQ6IGAke3NjZW5lLnNjZW5lSWR9X2xlZ2FjeWAsXG4gICAgICBuYXJyYXRpb246IHNjZW5lLm5hcnJhdGlvbiA/PyBcIlwiLFxuICAgICAgZHVyYXRpb25TZWNvbmRzOiBzY2VuZS5kdXJhdGlvblNlY29uZHMsXG4gICAgICBzY3JlZW5UZXh0OiBzY2VuZS5zY3JlZW5UZXh0Py5sZW5ndGggPyBzY2VuZS5zY3JlZW5UZXh0IDogW3NjZW5lLnRpdGxlXSxcbiAgICAgIGNsYWltczogW10sXG4gICAgICBzb3VyY2VJZHM6IFtdLFxuICAgICAgdmlzdWFsUGxhbjogc2NlbmUudmlzdWFsUGxhbixcbiAgICAgIGF1ZGlvVXJsOiBzY2VuZS5hdWRpb1VybCA/PyBcIlwiXG4gICAgfVxuICB9XTtcbn0pKTtcbmNvbnN0IGN1cnJlbnRTdGVwID0gY29tcHV0ZWQ8UGxheWVyU3RlcCB8IG51bGw+KCgpID0+IHN0ZXBzLnZhbHVlW2N1cnJlbnRTY2VuZUluZGV4LnZhbHVlXSA/PyBudWxsKTtcbmNvbnN0IGN1cnJlbnRTY2VuZSA9IGNvbXB1dGVkPFZpZGVvTGVzc29uU2NlbmUgfCBudWxsPigoKSA9PiBjdXJyZW50U3RlcC52YWx1ZT8uc2NlbmUgPz8gbnVsbCk7XG5jb25zdCBjdXJyZW50QmVhdCA9IGNvbXB1dGVkPFZpZGVvTmFycmF0aW9uQmVhdCB8IG51bGw+KCgpID0+IGN1cnJlbnRTdGVwLnZhbHVlPy5iZWF0ID8/IG51bGwpO1xuY29uc3QgY3VycmVudFZpc3VhbFBsYW4gPSBjb21wdXRlZDxWaXN1YWxQbGFuIHwgbnVsbD4oKCkgPT4gY3VycmVudEJlYXQudmFsdWU/LnZpc3VhbFBsYW4gPz8gbnVsbCk7XG5jb25zdCB0b3RhbFByb2dyZXNzID0gY29tcHV0ZWQoKCkgPT4ge1xuICBjb25zdCBzY2VuZUNvdW50ID0gc3RlcHMudmFsdWUubGVuZ3RoO1xuICByZXR1cm4gc2NlbmVDb3VudCA/ICgoY3VycmVudFNjZW5lSW5kZXgudmFsdWUgKyBzY2VuZVByb2dyZXNzLnZhbHVlIC8gMTAwKSAvIHNjZW5lQ291bnQpICogMTAwIDogMDtcclxufSk7XHJcblxyXG53YXRjaCgoKSA9PiBwcm9wcy5jb250ZW50LCAoKSA9PiB7XHJcbiAgY3VycmVudFNjZW5lSW5kZXgudmFsdWUgPSAwO1xyXG4gIHNjZW5lUHJvZ3Jlc3MudmFsdWUgPSAwO1xyXG4gIHBsYXlpbmcudmFsdWUgPSBmYWxzZTtcclxufSk7XHJcblxyXG5jb25zdCBhbmltYXRpb25DbGFzcyA9IChlbGVtZW50OiBWaXN1YWxFbGVtZW50KSA9PiBgbW90aW9uLSR7ZWxlbWVudC5hbmltYXRpb259YDtcclxuY29uc3QgYW5pbWF0aW9uRGVsYXkgPSAoaW5kZXg6IG51bWJlcikgPT4gKHsgYW5pbWF0aW9uRGVsYXk6IGAke2luZGV4ICogOTB9bXNgIH0pO1xyXG5cclxuZnVuY3Rpb24gcHJldmlvdXNTY2VuZSgpIHtcclxuICBpZiAoY3VycmVudFNjZW5lSW5kZXgudmFsdWUgPiAwKSB7XHJcbiAgICBjdXJyZW50U2NlbmVJbmRleC52YWx1ZSAtPSAxO1xyXG4gICAgdm9pZCByZXN0YXJ0QXVkaW8oKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5leHRTY2VuZSgpIHtcbiAgY29uc3Qgc2NlbmVzID0gc3RlcHMudmFsdWU7XG4gIGlmIChjdXJyZW50U2NlbmVJbmRleC52YWx1ZSA8IHNjZW5lcy5sZW5ndGggLSAxKSB7XHJcbiAgICBjdXJyZW50U2NlbmVJbmRleC52YWx1ZSArPSAxO1xyXG4gICAgdm9pZCByZXN0YXJ0QXVkaW8oKTtcclxuICB9IGVsc2Uge1xyXG4gICAgcGxheWluZy52YWx1ZSA9IGZhbHNlO1xyXG4gICAgc2NlbmVQcm9ncmVzcy52YWx1ZSA9IDEwMDtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHRvZ2dsZVBsYXkoKSB7XHJcbiAgY29uc3QgYXVkaW8gPSBhdWRpb0VsZW1lbnQudmFsdWU7XHJcbiAgaWYgKCFhdWRpbykgcmV0dXJuO1xyXG4gIGlmIChhdWRpby5wYXVzZWQpIGF3YWl0IGF1ZGlvLnBsYXkoKTtcclxuICBlbHNlIGF1ZGlvLnBhdXNlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVByb2dyZXNzKCkge1xyXG4gIGNvbnN0IGF1ZGlvID0gYXVkaW9FbGVtZW50LnZhbHVlO1xyXG4gIGlmIChhdWRpbz8uZHVyYXRpb24pIHNjZW5lUHJvZ3Jlc3MudmFsdWUgPSAoYXVkaW8uY3VycmVudFRpbWUgLyBhdWRpby5kdXJhdGlvbikgKiAxMDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZUVuZGVkKCkge1xyXG4gIHNjZW5lUHJvZ3Jlc3MudmFsdWUgPSAxMDA7XHJcbiAgaWYgKGF1dG9QbGF5LnZhbHVlKSBuZXh0U2NlbmUoKTtcclxuICBlbHNlIHBsYXlpbmcudmFsdWUgPSBmYWxzZTtcclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gcmVzdGFydEF1ZGlvKCkge1xyXG4gIHNjZW5lUHJvZ3Jlc3MudmFsdWUgPSAwO1xyXG4gIGF3YWl0IG5leHRUaWNrKCk7XHJcbiAgY29uc3QgYXVkaW8gPSBhdWRpb0VsZW1lbnQudmFsdWU7XHJcbiAgaWYgKCFhdWRpbykgcmV0dXJuO1xyXG4gIGF1ZGlvLmxvYWQoKTtcclxuICBpZiAoYXV0b1BsYXkudmFsdWUgfHwgcGxheWluZy52YWx1ZSkgYXdhaXQgYXVkaW8ucGxheSgpO1xyXG59XHJcbjwvc2NyaXB0PlxyXG5cclxuPHRlbXBsYXRlPlxyXG4gIDxzZWN0aW9uIHYtaWY9XCJsZXNzb24gJiYgY3VycmVudFNjZW5lICYmIGN1cnJlbnRCZWF0ICYmIGN1cnJlbnRWaXN1YWxQbGFuXCIgY2xhc3M9XCJ2aWRlby1sZXNzb24tcGxheWVyXCI+XG4gICAgPGRpdiBjbGFzcz1cImxlc3Nvbi1zdGFnZVwiPlxyXG4gICAgICA8aGVhZGVyIGNsYXNzPVwic3RhZ2UtaGVhZGVyXCI+XHJcbiAgICAgICAgPGRpdj5cclxuICAgICAgICAgIDxwPuivvueoi+iusuinozwvcD5cclxuICAgICAgICAgIDxoMj57eyBsZXNzb24udGl0bGUgfX08L2gyPlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDxkaXYgY2xhc3M9XCJzY2VuZS1tZXRhXCI+PHNwYW4+e3sgY3VycmVudFNjZW5lLnNjZW5lVHlwZSB9fTwvc3Bhbj57eyBjdXJyZW50U2NlbmVJbmRleCArIDEgfX0gLyB7eyBzdGVwcy5sZW5ndGggfX08L2Rpdj5cbiAgICAgIDwvaGVhZGVyPlxuXG4gICAgICA8bWFpbiBjbGFzcz1cIm1vdGlvbi1zdGFnZVwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwic2NyZWVuLWNvcHlcIj5cbiAgICAgICAgICA8aDM+e3sgY3VycmVudEJlYXQuc2NyZWVuVGV4dFswXSB9fTwvaDM+XG4gICAgICAgICAgPHVsIHYtaWY9XCJjdXJyZW50QmVhdC5zY3JlZW5UZXh0Lmxlbmd0aCA+IDFcIj5cbiAgICAgICAgICAgIDxsaSB2LWZvcj1cIml0ZW0gaW4gY3VycmVudEJlYXQuc2NyZWVuVGV4dC5zbGljZSgxLCAzKVwiIDprZXk9XCJpdGVtXCI+e3sgaXRlbSB9fTwvbGk+XG4gICAgICAgICAgPC91bD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxzZWN0aW9uIGNsYXNzPVwidmlzdWFsLXBsYW5cIiA6Y2xhc3M9XCJgbGF5b3V0LSR7Y3VycmVudFZpc3VhbFBsYW4ubGF5b3V0fWBcIj5cbiAgICAgICAgICA8dGVtcGxhdGUgdi1mb3I9XCIoZWxlbWVudCwgaW5kZXgpIGluIGN1cnJlbnRWaXN1YWxQbGFuLmVsZW1lbnRzXCIgOmtleT1cImAke2VsZW1lbnQudHlwZX0tJHtpbmRleH1gXCI+XG4gICAgICAgICAgICA8ZGl2IHYtaWY9XCJlbGVtZW50LnR5cGUgPT09ICd0ZXh0JyB8fCBlbGVtZW50LnR5cGUgPT09ICdrZXl3b3JkJ1wiIGNsYXNzPVwibW90aW9uLXRleHRcIiA6Y2xhc3M9XCJbYW5pbWF0aW9uQ2xhc3MoZWxlbWVudCksIHsga2V5d29yZDogZWxlbWVudC50eXBlID09PSAna2V5d29yZCcgfV1cIiA6c3R5bGU9XCJhbmltYXRpb25EZWxheShpbmRleClcIj5cclxuICAgICAgICAgICAgICB7eyBlbGVtZW50LmNvbnRlbnQgfX1cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgdi1lbHNlLWlmPVwiZWxlbWVudC50eXBlID09PSAnY2FyZCdcIiBjbGFzcz1cImNvbmNlcHQtY2FyZFwiIDpjbGFzcz1cImFuaW1hdGlvbkNsYXNzKGVsZW1lbnQpXCIgOnN0eWxlPVwiYW5pbWF0aW9uRGVsYXkoaW5kZXgpXCI+e3sgZWxlbWVudC5jb250ZW50IH19PC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgdi1lbHNlLWlmPVwiZWxlbWVudC50eXBlID09PSAnaWNvbidcIiBjbGFzcz1cImljb24tYnViYmxlXCIgOmNsYXNzPVwiYW5pbWF0aW9uQ2xhc3MoZWxlbWVudClcIiA6c3R5bGU9XCJhbmltYXRpb25EZWxheShpbmRleClcIj48c3Bhbj57eyBlbGVtZW50Lm5hbWUgfX08L3NwYW4+PC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgdi1lbHNlLWlmPVwiZWxlbWVudC50eXBlID09PSAnYXJyb3cnXCIgY2xhc3M9XCJhcnJvdy1mbG93XCIgOmNsYXNzPVwiYW5pbWF0aW9uQ2xhc3MoZWxlbWVudClcIiA6c3R5bGU9XCJhbmltYXRpb25EZWxheShpbmRleClcIj48c21hbGw+e3sgZWxlbWVudC5sYWJlbCB9fTwvc21hbGw+PHNwYW4+PC9zcGFuPjwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IHYtZWxzZS1pZj1cImVsZW1lbnQudHlwZSA9PT0gJ2NpcmNsZSdcIiBjbGFzcz1cImNpcmNsZS1sYWJlbFwiIDpjbGFzcz1cImFuaW1hdGlvbkNsYXNzKGVsZW1lbnQpXCIgOnN0eWxlPVwiYW5pbWF0aW9uRGVsYXkoaW5kZXgpXCI+e3sgZWxlbWVudC5sYWJlbCB9fTwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IHYtZWxzZS1pZj1cImVsZW1lbnQudHlwZSA9PT0gJ2dyaWQnXCIgY2xhc3M9XCJncmlkLWZvY3VzXCIgOmNsYXNzPVwiYW5pbWF0aW9uQ2xhc3MoZWxlbWVudClcIiA6c3R5bGU9XCJhbmltYXRpb25EZWxheShpbmRleClcIj5cclxuICAgICAgICAgICAgICA8c3Ryb25nPnt7IGVsZW1lbnQubGFiZWwgfX08L3N0cm9uZz5cclxuICAgICAgICAgICAgICA8ZGl2PjxzcGFuIHYtZm9yPVwiKGl0ZW0sIGl0ZW1JbmRleCkgaW4gZWxlbWVudC5pdGVtcyA/PyBbJzAnLCcxJywnMicsJzMnLCc0JywnNScsJzYnLCc3JywnOCddXCIgOmtleT1cImAke2l0ZW19LSR7aXRlbUluZGV4fWBcIiA6Y2xhc3M9XCJ7IGFjdGl2ZTogaXRlbUluZGV4ID09PSBlbGVtZW50LmhpZ2hsaWdodEluZGV4IH1cIj57eyBpdGVtIH19PC9zcGFuPjwvZGl2PlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPGRpdiB2LWVsc2UtaWY9XCJlbGVtZW50LnR5cGUgPT09ICdoYXNoX3RhYmxlX2J1Y2tldHMnXCIgY2xhc3M9XCJkYXRhLXN0cnVjdHVyZSBoYXNoLWJ1Y2tldHNcIiA6Y2xhc3M9XCJhbmltYXRpb25DbGFzcyhlbGVtZW50KVwiIDpzdHlsZT1cImFuaW1hdGlvbkRlbGF5KGluZGV4KVwiPlxyXG4gICAgICAgICAgICAgIDxzdHJvbmc+e3sgZWxlbWVudC5rZXlMYWJlbCA/PyBcImhhc2ggYnVja2V0c1wiIH19PC9zdHJvbmc+XHJcbiAgICAgICAgICAgICAgPGRpdj48c3BhbiB2LWZvcj1cIihidWNrZXQsIGJ1Y2tldEluZGV4KSBpbiBlbGVtZW50LmJ1Y2tldHNcIiA6a2V5PVwiYCR7YnVja2V0fS0ke2J1Y2tldEluZGV4fWBcIiA6Y2xhc3M9XCJ7IGFjdGl2ZTogYnVja2V0SW5kZXggPT09IGVsZW1lbnQuYWN0aXZlSW5kZXgsIGNvbGxpc2lvbjogZWxlbWVudC5jb2xsaXNpb25JbmRpY2VzPy5pbmNsdWRlcyhidWNrZXRJbmRleCkgfVwiPiN7eyBidWNrZXQgfX08L3NwYW4+PC9kaXY+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IHYtZWxzZS1pZj1cImVsZW1lbnQudHlwZSA9PT0gJ2hhc2hfZnVuY3Rpb25fcGFuZWwnXCIgY2xhc3M9XCJkYXRhLXN0cnVjdHVyZSBmdW5jdGlvbi1wYW5lbFwiIDpjbGFzcz1cImFuaW1hdGlvbkNsYXNzKGVsZW1lbnQpXCIgOnN0eWxlPVwiYW5pbWF0aW9uRGVsYXkoaW5kZXgpXCI+XHJcbiAgICAgICAgICAgICAgPHNwYW4+e3sgZWxlbWVudC5pbnB1dEtleSB9fTwvc3Bhbj48Yj5oYXNoPC9iPjxzcGFuPnt7IGVsZW1lbnQuZXhwcmVzc2lvbiB9fTwvc3Bhbj48Yj49PC9iPjxzcGFuPnt7IGVsZW1lbnQub3V0cHV0SW5kZXggfX08L3NwYW4+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IHYtZWxzZS1pZj1cImVsZW1lbnQudHlwZSA9PT0gJ2NvbGxpc2lvbl9jaGFpbicgfHwgZWxlbWVudC50eXBlID09PSAnbGlua2VkX2xpc3Rfbm9kZXMnXCIgY2xhc3M9XCJkYXRhLXN0cnVjdHVyZSBub2RlLWNoYWluXCIgOmNsYXNzPVwiYW5pbWF0aW9uQ2xhc3MoZWxlbWVudClcIiA6c3R5bGU9XCJhbmltYXRpb25EZWxheShpbmRleClcIj5cclxuICAgICAgICAgICAgICA8c3BhbiB2LWZvcj1cIihub2RlLCBub2RlSW5kZXgpIGluIGVsZW1lbnQubm9kZXNcIiA6a2V5PVwiYCR7bm9kZX0tJHtub2RlSW5kZXh9YFwiIDpjbGFzcz1cInsgYWN0aXZlOiBub2RlSW5kZXggPT09IChlbGVtZW50LnR5cGUgPT09ICdjb2xsaXNpb25fY2hhaW4nID8gZWxlbWVudC5hY3RpdmVOb2RlSW5kZXggOiBlbGVtZW50LmFjdGl2ZUluZGV4KSB9XCI+e3sgbm9kZSB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgdi1lbHNlLWlmPVwiZWxlbWVudC50eXBlID09PSAnYXJyYXlfY2VsbHMnXCIgY2xhc3M9XCJkYXRhLXN0cnVjdHVyZSBhcnJheS1jZWxsc1wiIDpjbGFzcz1cImFuaW1hdGlvbkNsYXNzKGVsZW1lbnQpXCIgOnN0eWxlPVwiYW5pbWF0aW9uRGVsYXkoaW5kZXgpXCI+XHJcbiAgICAgICAgICAgICAgPHNwYW4gdi1mb3I9XCIoaXRlbSwgaXRlbUluZGV4KSBpbiBlbGVtZW50Lml0ZW1zXCIgOmtleT1cImAke2l0ZW19LSR7aXRlbUluZGV4fWBcIiA6Y2xhc3M9XCJ7IGFjdGl2ZTogZWxlbWVudC5hY3RpdmVJbmRpY2VzPy5pbmNsdWRlcyhpdGVtSW5kZXgpIH1cIj57eyBpdGVtIH19PC9zcGFuPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPGRpdiB2LWVsc2UtaWY9XCJlbGVtZW50LnR5cGUgPT09ICdzdGFja19ibG9ja3MnXCIgY2xhc3M9XCJkYXRhLXN0cnVjdHVyZSBzdGFjay1ibG9ja3NcIiA6Y2xhc3M9XCJhbmltYXRpb25DbGFzcyhlbGVtZW50KVwiIDpzdHlsZT1cImFuaW1hdGlvbkRlbGF5KGluZGV4KVwiPlxyXG4gICAgICAgICAgICAgIDxzdHJvbmc+e3sgZWxlbWVudC5vcGVyYXRpb24gfX08L3N0cm9uZz5cclxuICAgICAgICAgICAgICA8c3BhbiB2LWZvcj1cIihpdGVtLCBpdGVtSW5kZXgpIGluIGVsZW1lbnQuaXRlbXNcIiA6a2V5PVwiYCR7aXRlbX0tJHtpdGVtSW5kZXh9YFwiIDpjbGFzcz1cInsgYWN0aXZlOiBpdGVtSW5kZXggPT09IGVsZW1lbnQuYWN0aXZlSW5kZXggfVwiPnt7IGl0ZW0gfX08L3NwYW4+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IHYtZWxzZS1pZj1cImVsZW1lbnQudHlwZSA9PT0gJ3F1ZXVlX2xpbmUnXCIgY2xhc3M9XCJkYXRhLXN0cnVjdHVyZSBxdWV1ZS1saW5lXCIgOmNsYXNzPVwiYW5pbWF0aW9uQ2xhc3MoZWxlbWVudClcIiA6c3R5bGU9XCJhbmltYXRpb25EZWxheShpbmRleClcIj5cclxuICAgICAgICAgICAgICA8c3Ryb25nPnt7IGVsZW1lbnQub3BlcmF0aW9uIH19PC9zdHJvbmc+XHJcbiAgICAgICAgICAgICAgPHNwYW4gdi1mb3I9XCIoaXRlbSwgaXRlbUluZGV4KSBpbiBlbGVtZW50Lml0ZW1zXCIgOmtleT1cImAke2l0ZW19LSR7aXRlbUluZGV4fWBcIiA6Y2xhc3M9XCJ7IGFjdGl2ZTogaXRlbUluZGV4ID09PSBlbGVtZW50LmhlYWRJbmRleCB8fCBpdGVtSW5kZXggPT09IGVsZW1lbnQudGFpbEluZGV4IH1cIj57eyBpdGVtIH19PC9zcGFuPlxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgPGRpdiB2LWVsc2UtaWY9XCJlbGVtZW50LnR5cGUgPT09ICd0cmVlX25vZGVfZ3JhcGgnXCIgY2xhc3M9XCJkYXRhLXN0cnVjdHVyZSB0cmVlLXByZXZpZXdcIiA6Y2xhc3M9XCJhbmltYXRpb25DbGFzcyhlbGVtZW50KVwiIDpzdHlsZT1cImFuaW1hdGlvbkRlbGF5KGluZGV4KVwiPlxyXG4gICAgICAgICAgICAgIDxzcGFuIHYtZm9yPVwibm9kZSBpbiBlbGVtZW50Lm5vZGVzXCIgOmtleT1cIm5vZGVcIiA6Y2xhc3M9XCJ7IGFjdGl2ZTogZWxlbWVudC5hY3RpdmVQYXRoPy5pbmNsdWRlcyhub2RlKSB9XCI+e3sgbm9kZSB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxwcmUgdi1lbHNlLWlmPVwiZWxlbWVudC50eXBlID09PSAnY29kZV90cmFjZV9wYW5lbCdcIiBjbGFzcz1cImNvZGUtZWxlbWVudFwiIDpjbGFzcz1cImFuaW1hdGlvbkNsYXNzKGVsZW1lbnQpXCIgOnN0eWxlPVwiYW5pbWF0aW9uRGVsYXkoaW5kZXgpXCI+PGNvZGU+e3sgZWxlbWVudC5jb2RlTGluZXMuam9pbihcIlxcblwiKSB9fTwvY29kZT48L3ByZT5cclxuICAgICAgICAgICAgPGRpdiB2LWVsc2UtaWY9XCJlbGVtZW50LnR5cGUgPT09ICdwb2ludGVyX2Fycm93J1wiIGNsYXNzPVwiZGF0YS1zdHJ1Y3R1cmUgcG9pbnRlci1wcmV2aWV3XCIgOmNsYXNzPVwiYW5pbWF0aW9uQ2xhc3MoZWxlbWVudClcIiA6c3R5bGU9XCJhbmltYXRpb25EZWxheShpbmRleClcIj5cclxuICAgICAgICAgICAgICA8c3Bhbj57eyBlbGVtZW50LmZyb21MYWJlbCB9fTwvc3Bhbj48Yj57eyBlbGVtZW50LmxhYmVsIH19PC9iPjxzcGFuPnt7IGVsZW1lbnQudG9MYWJlbCB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgdi1lbHNlLWlmPVwiZWxlbWVudC50eXBlID09PSAnbWVtb3J5X2JveCdcIiBjbGFzcz1cImRhdGEtc3RydWN0dXJlIG1lbW9yeS1ib3hcIiA6Y2xhc3M9XCJhbmltYXRpb25DbGFzcyhlbGVtZW50KVwiIDpzdHlsZT1cImFuaW1hdGlvbkRlbGF5KGluZGV4KVwiPlxyXG4gICAgICAgICAgICAgIDxzbWFsbD57eyBlbGVtZW50LmFkZHJlc3MgfX08L3NtYWxsPjxzcGFuIDpjbGFzcz1cInsgYWN0aXZlOiBlbGVtZW50LmFjdGl2ZSB9XCI+e3sgZWxlbWVudC52YWx1ZSB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgdi1lbHNlLWlmPVwiZWxlbWVudC50eXBlID09PSAnY29tcGxleGl0eV9jaGFydCdcIiBjbGFzcz1cImRhdGEtc3RydWN0dXJlIGNvbXBsZXhpdHktY2hhcnRcIiA6Y2xhc3M9XCJhbmltYXRpb25DbGFzcyhlbGVtZW50KVwiIDpzdHlsZT1cImFuaW1hdGlvbkRlbGF5KGluZGV4KVwiPlxyXG4gICAgICAgICAgICAgIDxzdHJvbmc+e3sgZWxlbWVudC5sYWJlbCB9fTwvc3Ryb25nPlxyXG4gICAgICAgICAgICAgIDxzcGFuIHYtZm9yPVwiKGl0ZW0sIGl0ZW1JbmRleCkgaW4gZWxlbWVudC5pdGVtc1wiIDprZXk9XCJgJHtpdGVtfS0ke2l0ZW1JbmRleH1gXCIgOmNsYXNzPVwieyBhY3RpdmU6IGl0ZW1JbmRleCA9PT0gZWxlbWVudC5hY3RpdmVJbmRleCB9XCI+e3sgaXRlbSB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxvbCB2LWVsc2UtaWY9XCJlbGVtZW50LnR5cGUgPT09ICd0aW1lbGluZSdcIiBjbGFzcz1cInRpbWVsaW5lLXN0ZXBzXCIgOmNsYXNzPVwiYW5pbWF0aW9uQ2xhc3MoZWxlbWVudClcIiA6c3R5bGU9XCJhbmltYXRpb25EZWxheShpbmRleClcIj5cclxuICAgICAgICAgICAgICA8bGkgdi1mb3I9XCJpdGVtIGluIGVsZW1lbnQuaXRlbXNcIiA6a2V5PVwiaXRlbVwiPnt7IGl0ZW0gfX08L2xpPlxyXG4gICAgICAgICAgICA8L29sPlxyXG4gICAgICAgICAgICA8aW1nIHYtZWxzZS1pZj1cImVsZW1lbnQudHlwZSA9PT0gJ2ltYWdlJ1wiIGNsYXNzPVwibW90aW9uLWltYWdlXCIgOmNsYXNzPVwiYW5pbWF0aW9uQ2xhc3MoZWxlbWVudClcIiA6c3R5bGU9XCJhbmltYXRpb25EZWxheShpbmRleClcIiA6c3JjPVwiZWxlbWVudC5pbWFnZVVybFwiIDphbHQ9XCJlbGVtZW50LmFsdFwiIC8+XHJcbiAgICAgICAgICAgIDxwcmUgdi1lbHNlLWlmPVwiZWxlbWVudC50eXBlID09PSAnY29kZSdcIiBjbGFzcz1cImNvZGUtZWxlbWVudFwiIDpjbGFzcz1cImFuaW1hdGlvbkNsYXNzKGVsZW1lbnQpXCIgOnN0eWxlPVwiYW5pbWF0aW9uRGVsYXkoaW5kZXgpXCI+PGNvZGU+e3sgZWxlbWVudC5jb250ZW50IH19PC9jb2RlPjwvcHJlPlxyXG4gICAgICAgICAgICA8ZGl2IHYtZWxzZS1pZj1cImVsZW1lbnQudHlwZSA9PT0gJ2Zvcm11bGEnXCIgY2xhc3M9XCJmb3JtdWxhLWVsZW1lbnRcIiA6Y2xhc3M9XCJhbmltYXRpb25DbGFzcyhlbGVtZW50KVwiIDpzdHlsZT1cImFuaW1hdGlvbkRlbGF5KGluZGV4KVwiPnt7IGVsZW1lbnQuY29udGVudCB9fTwvZGl2PlxyXG4gICAgICAgICAgPC90ZW1wbGF0ZT5cclxuICAgICAgICA8L3NlY3Rpb24+XHJcbiAgICAgIDwvbWFpbj5cclxuXHJcbiAgICAgIDxkaXYgY2xhc3M9XCJzdGFnZS1wcm9ncmVzc1wiPjxzcGFuIDpzdHlsZT1cInsgd2lkdGg6IGAke3RvdGFsUHJvZ3Jlc3N9JWAgfVwiPjwvc3Bhbj48L2Rpdj5cclxuICAgIDwvZGl2PlxyXG5cclxuICAgIDxzZWN0aW9uIGNsYXNzPVwic3VidGl0bGVcIj48c3Ryb25nPuaXgeeZveWtl+W5lTwvc3Ryb25nPjxwPnt7IGN1cnJlbnRCZWF0Lm5hcnJhdGlvbiB9fTwvcD48L3NlY3Rpb24+XG4gICAgPHNlY3Rpb24gY2xhc3M9XCJzY2VuZS1hdWRpdFwiPlxyXG4gICAgICA8ZGl2IHYtaWY9XCJjdXJyZW50U2NlbmUudGVhY2hpbmdQdXJwb3NlXCI+PHN0cm9uZz5QdXJwb3NlPC9zdHJvbmc+PHNwYW4+e3sgY3VycmVudFNjZW5lLnRlYWNoaW5nUHVycG9zZSB9fTwvc3Bhbj48L2Rpdj5cclxuICAgICAgPGRpdiB2LWlmPVwiY3VycmVudFNjZW5lLmNvbmNyZXRlT2JqZWN0cz8ubGVuZ3RoXCI+PHN0cm9uZz5PYmplY3RzPC9zdHJvbmc+PHNwYW4+e3sgY3VycmVudFNjZW5lLmNvbmNyZXRlT2JqZWN0cy5qb2luKFwiIC8gXCIpIH19PC9zcGFuPjwvZGl2PlxyXG4gICAgICA8ZGl2IHYtaWY9XCJjdXJyZW50U2NlbmUuc3RhdGVDaGFuZ2VzPy5sZW5ndGhcIj48c3Ryb25nPlN0YXRlPC9zdHJvbmc+PHNwYW4+e3sgY3VycmVudFNjZW5lLnN0YXRlQ2hhbmdlcy5qb2luKFwiIC0+IFwiKSB9fTwvc3Bhbj48L2Rpdj5cclxuICAgICAgPGRpdiB2LWlmPVwiY3VycmVudFNjZW5lLm1pc2NvbmNlcHRpb25GaXhcIj48c3Ryb25nPkZpeDwvc3Ryb25nPjxzcGFuPnt7IGN1cnJlbnRTY2VuZS5taXNjb25jZXB0aW9uRml4IH19PC9zcGFuPjwvZGl2PlxyXG4gICAgICA8b2wgdi1pZj1cImN1cnJlbnRTY2VuZS5hbmltYXRpb25TdGVwcz8ubGVuZ3RoXCIgY2xhc3M9XCJhbmltYXRpb24tc3RlcC1saXN0XCI+XHJcbiAgICAgICAgPGxpIHYtZm9yPVwic3RlcCBpbiBjdXJyZW50U2NlbmUuYW5pbWF0aW9uU3RlcHNcIiA6a2V5PVwiYCR7c3RlcC5zdGFydFN0YXRlfS0ke3N0ZXAuZW5kU3RhdGV9YFwiPlxyXG4gICAgICAgICAge3sgc3RlcC5zdGFydFN0YXRlIH19IC0+IHt7IHN0ZXAuZW5kU3RhdGUgfX0gLyB7eyBzdGVwLnZpc3VhbEFjdGlvbiB9fVxyXG4gICAgICAgIDwvbGk+XHJcbiAgICAgIDwvb2w+XHJcbiAgICA8L3NlY3Rpb24+XHJcbiAgICA8YXVkaW8gcmVmPVwiYXVkaW9FbGVtZW50XCIgOnNyYz1cImN1cnJlbnRCZWF0LmF1ZGlvVXJsXCIgQHRpbWV1cGRhdGU9XCJ1cGRhdGVQcm9ncmVzc1wiIEBlbmRlZD1cImhhbmRsZUVuZGVkXCIgQHBsYXk9XCJwbGF5aW5nID0gdHJ1ZVwiIEBwYXVzZT1cInBsYXlpbmcgPSBmYWxzZVwiIC8+XG4gICAgPGZvb3RlciBjbGFzcz1cInBsYXllci1jb250cm9sc1wiPlxyXG4gICAgICA8ZWwtYnV0dG9uIDpkaXNhYmxlZD1cImN1cnJlbnRTY2VuZUluZGV4ID09PSAwXCIgQGNsaWNrPVwicHJldmlvdXNTY2VuZVwiPuS4iuS4gOatpTwvZWwtYnV0dG9uPlxyXG4gICAgICA8ZWwtYnV0dG9uIHR5cGU9XCJwcmltYXJ5XCIgQGNsaWNrPVwidG9nZ2xlUGxheVwiPnt7IHBsYXlpbmcgPyBcIuaaguWBnFwiIDogXCLmkq3mlL7ml4Hnmb1cIiB9fTwvZWwtYnV0dG9uPlxyXG4gICAgICA8ZWwtYnV0dG9uIDpkaXNhYmxlZD1cImN1cnJlbnRTY2VuZUluZGV4ID09PSBzdGVwcy5sZW5ndGggLSAxXCIgQGNsaWNrPVwibmV4dFNjZW5lXCI+5LiL5LiA5q2lPC9lbC1idXR0b24+XG4gICAgICA8ZWwtY2hlY2tib3ggdi1tb2RlbD1cImF1dG9QbGF5XCI+6Ieq5Yqo5pKt5pS+PC9lbC1jaGVja2JveD5cclxuICAgIDwvZm9vdGVyPlxyXG4gIDwvc2VjdGlvbj5cclxuICA8ZWwtYWxlcnQgdi1lbHNlIHRpdGxlPVwi6KeG6aKR6LWE5rqQIEpTT04g5peg5rOV6Kej5p6Q77yM6K+36YeN5paw55Sf5oiQ6LWE5rqQXCIgdHlwZT1cImVycm9yXCIgOmNsb3NhYmxlPVwiZmFsc2VcIiBzaG93LWljb24gLz5cclxuPC90ZW1wbGF0ZT5cclxuXHJcbjxzdHlsZSBzY29wZWQ+XHJcbi52aWRlby1sZXNzb24tcGxheWVyIHsgZGlzcGxheTogZ3JpZDsgZ2FwOiAxNHB4OyB9XHJcbi5sZXNzb24tc3RhZ2UgeyBhc3BlY3QtcmF0aW86IDE2IC8gOTsgZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1yb3dzOiBhdXRvIDFmciBhdXRvOyBnYXA6IDE2cHg7IHBhZGRpbmc6IDI0cHg7IG92ZXJmbG93OiBoaWRkZW47IGJveC1zaXppbmc6IGJvcmRlci1ib3g7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW5sLWJvcmRlcik7IGJvcmRlci1yYWRpdXM6IHZhcigtLW5sLXJhZGl1cy1sZyk7IGJhY2tncm91bmQ6IHZhcigtLW5sLXN1cmZhY2UpOyBjb2xvcjogdmFyKC0tbmwtdGV4dCk7IH1cclxuLnN0YWdlLWhlYWRlciwgLnBsYXllci1jb250cm9scywgLnNjZW5lLW1ldGEgeyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDEycHg7IH1cclxuLnN0YWdlLWhlYWRlciB7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgfVxyXG4uc3RhZ2UtaGVhZGVyIHAgeyBtYXJnaW46IDA7IGNvbG9yOiB2YXIoLS1ubC10ZXh0LXN1YnRsZSk7IGZvbnQtc2l6ZTogMTFweDsgZm9udC13ZWlnaHQ6IDcwMDsgbGV0dGVyLXNwYWNpbmc6IDEuMnB4OyB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyB9XHJcbi5zdGFnZS1oZWFkZXIgaDIsIC5tb3Rpb24tc3RhZ2UgaDMgeyBtYXJnaW46IDZweCAwIDA7IH1cbi5zY2VuZS1tZXRhIHsgY29sb3I6IHZhcigtLW5sLXRleHQtbXV0ZWQpOyBmb250LXNpemU6IDEzcHg7IH1cbi5zY2VuZS1tZXRhIHNwYW4geyBwYWRkaW5nOiA0cHggOXB4OyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ubC1ib3JkZXIpOyBib3JkZXItcmFkaXVzOiB2YXIoLS1ubC1yYWRpdXMtc20pOyBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1iZyk7IH1cbi5tb3Rpb24tc3RhZ2UgeyBkaXNwbGF5OiBncmlkOyBncmlkLXRlbXBsYXRlLXJvd3M6IGF1dG8gbWlubWF4KDAsIDFmcik7IGdhcDogMTJweDsgbWluLWhlaWdodDogMDsgfVxuLm1vdGlvbi1zdGFnZSBoMyB7IGNvbG9yOiB2YXIoLS1ubC1wcmltYXJ5KTsgfVxuLnNjcmVlbi1jb3B5IHsgZGlzcGxheTogZ3JpZDsgZ2FwOiA4cHg7IH1cbi5zY3JlZW4tY29weSB1bCB7IGRpc3BsYXk6IGZsZXg7IGZsZXgtd3JhcDogd3JhcDsgZ2FwOiA4cHg7IG1hcmdpbjogMDsgcGFkZGluZzogMDsgbGlzdC1zdHlsZTogbm9uZTsgfVxuLnNjcmVlbi1jb3B5IGxpIHsgcGFkZGluZzogNXB4IDlweDsgYm9yZGVyLWxlZnQ6IDNweCBzb2xpZCB2YXIoLS1ubC13YXJuaW5nKTsgYm9yZGVyLXJhZGl1czogdmFyKC0tbmwtcmFkaXVzLXNtKTsgYmFja2dyb3VuZDogdmFyKC0tbmwtc3VyZmFjZSk7IGNvbG9yOiB2YXIoLS1ubC10ZXh0LW11dGVkKTsgZm9udC1zaXplOiAxM3B4OyBmb250LXdlaWdodDogNjUwOyB9XG4udmlzdWFsLXBsYW4geyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgZmxleC13cmFwOiB3cmFwOyBnYXA6IDE0cHg7IG1pbi1oZWlnaHQ6IDA7IHBhZGRpbmc6IDEycHg7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW5sLWJvcmRlcik7IGJvcmRlci1yYWRpdXM6IHZhcigtLW5sLXJhZGl1cy1sZyk7IGJhY2tncm91bmQ6IHZhcigtLW5sLWJnKTsgfVxuLmxheW91dC1waXBlbGluZSB7IGZsZXgtZGlyZWN0aW9uOiByb3c7IGp1c3RpZnktY29udGVudDogc3BhY2UtYXJvdW5kOyB9XG4ubGF5b3V0LWxlZnRfcmlnaHQgeyBkaXNwbGF5OiBncmlkOyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdCgyLCBtaW5tYXgoMCwgMWZyKSk7IGFsaWduLWNvbnRlbnQ6IGNlbnRlcjsgfVxuLmxheW91dC1jZW50ZXJfZm9jdXMgeyBmbGV4LWRpcmVjdGlvbjogY29sdW1uOyB9XG4ubGF5b3V0LXN1bW1hcnlfY2FyZHMsIC5sYXlvdXQtY29tcGFyaXNvbiB7IGRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KDMsIG1pbm1heCgwLCAxZnIpKTsgfVxuLmxheW91dC1jb21wYXJpc29uIHsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoMiwgbWlubWF4KDAsIDFmcikpOyB9XG4ubGF5b3V0LWdyaWRfZm9jdXMgeyBkaXNwbGF5OiBncmlkOyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IG1pbm1heCgwLCAxLjNmcikgbWlubWF4KDE0MHB4LCAuN2ZyKTsgYWxpZ24tY29udGVudDogY2VudGVyOyB9XG4ubGF5b3V0LXRpbWVsaW5lIHsgZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiBtaW5tYXgoMCwgMWZyKSBtaW5tYXgoMjIwcHgsIDFmcik7IGFsaWduLWNvbnRlbnQ6IGNlbnRlcjsgfVxuLm1vdGlvbi10ZXh0LCAuY29uY2VwdC1jYXJkLCAuY2lyY2xlLWxhYmVsLCAuZm9ybXVsYS1lbGVtZW50LCAuY29kZS1lbGVtZW50IHsgcGFkZGluZzogMTNweCAxN3B4OyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ubC1ib3JkZXIpOyBib3JkZXItcmFkaXVzOiB2YXIoLS1ubC1yYWRpdXMtbWQpOyBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1zdXJmYWNlKTsgYm94LXNoYWRvdzogdmFyKC0tbmwtc2hhZG93LWNhcmQpOyB9XHJcbi5tb3Rpb24tdGV4dC5rZXl3b3JkLCAuY2lyY2xlLWxhYmVsIHsgYm9yZGVyLWNvbG9yOiB2YXIoLS1ubC1wcmltYXJ5LXNvZnQpOyBjb2xvcjogdmFyKC0tbmwtcHJpbWFyeSk7IGJvcmRlci1yYWRpdXM6IHZhcigtLW5sLXJhZGl1cy1zbSk7IGZvbnQtd2VpZ2h0OiA3MDA7IH1cclxuLmNvbmNlcHQtY2FyZCB7IGNvbG9yOiB2YXIoLS1ubC10ZXh0KTsgdGV4dC1hbGlnbjogY2VudGVyOyB9XHJcbi5pY29uLWJ1YmJsZSB7IGRpc3BsYXk6IGdyaWQ7IHBsYWNlLWl0ZW1zOiBjZW50ZXI7IHdpZHRoOiA4NHB4OyBoZWlnaHQ6IDg0cHg7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW5sLXByaW1hcnktc29mdCk7IGJvcmRlci1yYWRpdXM6IDUwJTsgY29sb3I6IHZhcigtLW5sLXByaW1hcnkpOyBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1wcmltYXJ5LXRpbnQpOyB9XHJcbi5hcnJvdy1mbG93IHsgZGlzcGxheTogZ3JpZDsganVzdGlmeS1pdGVtczogY2VudGVyOyBtaW4td2lkdGg6IDEwMHB4OyBjb2xvcjogdmFyKC0tbmwtcHJpbWFyeSk7IH1cclxuLmFycm93LWZsb3cgc3BhbiB7IGRpc3BsYXk6IGJsb2NrOyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAzcHg7IG1hcmdpbi10b3A6IDZweDsgYmFja2dyb3VuZDogdmFyKC0tbmwtcHJpbWFyeSk7IHRyYW5zZm9ybS1vcmlnaW46IGxlZnQ7IH1cclxuLmdyaWQtZm9jdXMgeyBkaXNwbGF5OiBncmlkOyBnYXA6IDhweDsgdGV4dC1hbGlnbjogY2VudGVyOyBjb2xvcjogdmFyKC0tbmwtcHJpbWFyeSk7IH1cclxuLmdyaWQtZm9jdXMgZGl2IHsgZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoMywgNDJweCk7IGdhcDogNXB4OyB9XHJcbi5ncmlkLWZvY3VzIHNwYW4geyBwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW5sLWJvcmRlcik7IGJvcmRlci1yYWRpdXM6IDZweDsgYmFja2dyb3VuZDogdmFyKC0tbmwtc3VyZmFjZSk7IGNvbG9yOiB2YXIoLS1ubC10ZXh0LW11dGVkKTsgfVxyXG4uZ3JpZC1mb2N1cyBzcGFuLmFjdGl2ZSB7IGJvcmRlci1jb2xvcjogdmFyKC0tbmwtd2FybmluZyk7IGJhY2tncm91bmQ6IHZhcigtLW5sLXdhcm5pbmctc29mdCk7IGNvbG9yOiB2YXIoLS1ubC10ZXh0KTsgfVxyXG4uZGF0YS1zdHJ1Y3R1cmUgeyBkaXNwbGF5OiBncmlkOyBnYXA6IDhweDsgcGFkZGluZzogMTNweCAxN3B4OyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ubC1ib3JkZXIpOyBib3JkZXItcmFkaXVzOiB2YXIoLS1ubC1yYWRpdXMtbWQpOyBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1zdXJmYWNlKTsgY29sb3I6IHZhcigtLW5sLXRleHQpOyB9XHJcbi5kYXRhLXN0cnVjdHVyZSBzdHJvbmcgeyBjb2xvcjogdmFyKC0tbmwtcHJpbWFyeSk7IH1cclxuLmRhdGEtc3RydWN0dXJlIHNwYW4geyBwYWRkaW5nOiA4cHggMTBweDsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tbmwtYm9yZGVyKTsgYm9yZGVyLXJhZGl1czogOHB4OyBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1iZyk7IHRleHQtYWxpZ246IGNlbnRlcjsgfVxyXG4uZGF0YS1zdHJ1Y3R1cmUgc3Bhbi5hY3RpdmUsIC5kYXRhLXN0cnVjdHVyZSBzcGFuLmNvbGxpc2lvbiB7IGJvcmRlci1jb2xvcjogdmFyKC0tbmwtd2FybmluZyk7IGJhY2tncm91bmQ6IHZhcigtLW5sLXdhcm5pbmctc29mdCk7IGNvbG9yOiB2YXIoLS1ubC10ZXh0KTsgfVxyXG4uaGFzaC1idWNrZXRzIGRpdiwgLmFycmF5LWNlbGxzLCAucXVldWUtbGluZSwgLm5vZGUtY2hhaW4sIC5mdW5jdGlvbi1wYW5lbCwgLnBvaW50ZXItcHJldmlldywgLmNvbXBsZXhpdHktY2hhcnQgeyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgZmxleC13cmFwOiB3cmFwOyBnYXA6IDhweDsgfVxyXG4uc3RhY2stYmxvY2tzIHsganVzdGlmeS1pdGVtczogY2VudGVyOyB9XHJcbi5zdGFjay1ibG9ja3Mgc3BhbiB7IG1pbi13aWR0aDogOTBweDsgfVxyXG4udHJlZS1wcmV2aWV3IHsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoMywgbWlubWF4KDAsIDFmcikpOyB9XHJcbi5tZW1vcnktYm94IHNtYWxsIHsgY29sb3I6IHZhcigtLW5sLXRleHQtc3VidGxlKTsgfVxyXG4udGltZWxpbmUtc3RlcHMgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDEwcHg7IHBhZGRpbmc6IDA7IGxpc3Qtc3R5bGUtcG9zaXRpb246IGluc2lkZTsgY29sb3I6IHZhcigtLW5sLXRleHQpOyB9XHJcbi50aW1lbGluZS1zdGVwcyBsaSB7IHBhZGRpbmc6IDEwcHg7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLW5sLWJvcmRlcik7IGJvcmRlci1yYWRpdXM6IHZhcigtLW5sLXJhZGl1cy1zbSk7IGJhY2tncm91bmQ6IHZhcigtLW5sLXN1cmZhY2UpOyB9XHJcbi5tb3Rpb24taW1hZ2UgeyB3aWR0aDogMjIwcHg7IGhlaWdodDogMTMycHg7IGJvcmRlci1yYWRpdXM6IHZhcigtLW5sLXJhZGl1cy1tZCk7IG9iamVjdC1maXQ6IGNvdmVyOyB9XHJcbi5zdWJ0aXRsZSB7IHBhZGRpbmc6IDEycHggMTZweDsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tbmwtYm9yZGVyKTsgYm9yZGVyLXJhZGl1czogdmFyKC0tbmwtcmFkaXVzLW1kKTsgYmFja2dyb3VuZDogdmFyKC0tbmwtc3VyZmFjZSk7IH1cclxuLnN1YnRpdGxlIHAgeyBtYXJnaW46IDZweCAwIDA7IGNvbG9yOiB2YXIoLS1ubC10ZXh0LW11dGVkKTsgbGluZS1oZWlnaHQ6IDEuNjsgfVxyXG4uc2NlbmUtYXVkaXQgeyBkaXNwbGF5OiBncmlkOyBnYXA6IDhweDsgcGFkZGluZzogMTJweCAxNnB4OyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ubC1ib3JkZXIpOyBib3JkZXItcmFkaXVzOiB2YXIoLS1ubC1yYWRpdXMtbWQpOyBiYWNrZ3JvdW5kOiB2YXIoLS1ubC1iZyk7IGNvbG9yOiB2YXIoLS1ubC10ZXh0LW11dGVkKTsgfVxyXG4uc2NlbmUtYXVkaXQgZGl2IHsgZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiA4NnB4IG1pbm1heCgwLCAxZnIpOyBnYXA6IDEwcHg7IH1cclxuLnNjZW5lLWF1ZGl0IHN0cm9uZyB7IGNvbG9yOiB2YXIoLS1ubC10ZXh0KTsgfVxyXG4uYW5pbWF0aW9uLXN0ZXAtbGlzdCB7IG1hcmdpbjogMDsgcGFkZGluZy1sZWZ0OiAyMHB4OyBsaW5lLWhlaWdodDogMS41NTsgfVxyXG4uc3RhZ2UtcHJvZ3Jlc3MgeyBoZWlnaHQ6IDVweDsgb3ZlcmZsb3c6IGhpZGRlbjsgYm9yZGVyLXJhZGl1czogOTk5cHg7IGJhY2tncm91bmQ6IHZhcigtLW5sLXN1cmZhY2UtbXV0ZWQpOyB9XHJcbi5zdGFnZS1wcm9ncmVzcyBzcGFuIHsgZGlzcGxheTogYmxvY2s7IGhlaWdodDogMTAwJTsgYmFja2dyb3VuZDogdmFyKC0tbmwtcHJpbWFyeSk7IH1cclxuLm1vdGlvbi1mYWRlX2luLCAubW90aW9uLXBvcF9pbiwgLm1vdGlvbi1zbGlkZV9pbl9sZWZ0LCAubW90aW9uLXNsaWRlX2luX3JpZ2h0LCAubW90aW9uLWZsb2F0LCAubW90aW9uLWRyYXcsIC5tb3Rpb24taGlnaGxpZ2h0LCAubW90aW9uLXpvb21faW4sIC5tb3Rpb24tc3RhZ2dlcl9pbiB7IGFuaW1hdGlvbjogZW50ZXIgMjIwbXMgYm90aDsgfVxyXG4ubW90aW9uLXNsaWRlX2luX2xlZnQgeyBhbmltYXRpb24tbmFtZTogZW50ZXItbGVmdDsgfS5tb3Rpb24tc2xpZGVfaW5fcmlnaHQgeyBhbmltYXRpb24tbmFtZTogZW50ZXItcmlnaHQ7IH0ubW90aW9uLXBvcF9pbiwgLm1vdGlvbi16b29tX2luIHsgYW5pbWF0aW9uLW5hbWU6IGVudGVyLXBvcDsgfS5tb3Rpb24tZmxvYXQgeyBhbmltYXRpb24tbmFtZTogZW50ZXI7IH0ubW90aW9uLWRyYXcgeyBhbmltYXRpb24tbmFtZTogZHJhdzsgfS5tb3Rpb24taGlnaGxpZ2h0IHsgYW5pbWF0aW9uLW5hbWU6IGVudGVyOyB9XHJcbkBrZXlmcmFtZXMgZW50ZXIgeyBmcm9tIHsgb3BhY2l0eTogMDsgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDhweCk7IH0gdG8geyBvcGFjaXR5OiAxOyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7IH0gfVxyXG5Aa2V5ZnJhbWVzIGVudGVyLWxlZnQgeyBmcm9tIHsgb3BhY2l0eTogMDsgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKC0xMnB4KTsgfSB0byB7IG9wYWNpdHk6IDE7IHRyYW5zZm9ybTogdHJhbnNsYXRlWCgwKTsgfSB9XHJcbkBrZXlmcmFtZXMgZW50ZXItcmlnaHQgeyBmcm9tIHsgb3BhY2l0eTogMDsgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKDEycHgpOyB9IHRvIHsgb3BhY2l0eTogMTsgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKDApOyB9IH1cclxuQGtleWZyYW1lcyBlbnRlci1wb3AgeyBmcm9tIHsgb3BhY2l0eTogMDsgdHJhbnNmb3JtOiBzY2FsZSguOTYpOyB9IHRvIHsgb3BhY2l0eTogMTsgdHJhbnNmb3JtOiBzY2FsZSgxKTsgfSB9XHJcbkBrZXlmcmFtZXMgZHJhdyB7IGZyb20geyBvcGFjaXR5OiAwOyB0cmFuc2Zvcm06IHNjYWxlWCgwKTsgfSB0byB7IG9wYWNpdHk6IDE7IHRyYW5zZm9ybTogc2NhbGVYKDEpOyB9IH1cclxuQG1lZGlhIChtYXgtd2lkdGg6IDc2MHB4KSB7IC5sZXNzb24tc3RhZ2UgeyBhc3BlY3QtcmF0aW86IGF1dG87IG1pbi1oZWlnaHQ6IDQyMHB4OyB9LmxheW91dC1zdW1tYXJ5X2NhcmRzLCAubGF5b3V0LWNvbXBhcmlzb24sIC5sYXlvdXQtbGVmdF9yaWdodCwgLmxheW91dC1ncmlkX2ZvY3VzLCAubGF5b3V0LXRpbWVsaW5lIHsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnI7IH0udGltZWxpbmUtc3RlcHMgeyBmbGV4LXdyYXA6IHdyYXA7IH0gfVxuQG1lZGlhIChwcmVmZXJzLXJlZHVjZWQtbW90aW9uOiByZWR1Y2UpIHsgLnZpc3VhbC1wbGFuICogeyBhbmltYXRpb24tZHVyYXRpb246IDFtcyAhaW1wb3J0YW50OyBhbmltYXRpb24taXRlcmF0aW9uLWNvdW50OiAxICFpbXBvcnRhbnQ7IH0gfVxuPC9zdHlsZT5cbiJdLCJmaWxlIjoiRDovZmlyc3Rtb25leS9ub2RlbGVhcm4tYWkvZnJvbnRlbmQvc3JjL2NvbXBvbmVudHMvVmlkZW9MZXNzb25QbGF5ZXIudnVlIn0=
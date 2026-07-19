from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError

from app.services.llm_service import LLMService
from app.services.video_pipeline.models import (
    Beat,
    BucketRowActor,
    CalloutActor,
    CodePanelActor,
    ComparisonLaneActor,
    CounterActor,
    DataTokenActor,
    FormulaActor,
    KeyActor,
    NarrativeSection,
    SceneTransition,
    StoryboardScene,
    TeachingStrategy,
    VariablePanelActor,
    ValidatedStoryboard,
    VideoGenerationContext,
    VideoNarrative,
    VideoStoryboard,
)


def _value(value: object | None) -> str | None:
    if value is None:
        return None
    return str(getattr(value, "value", value))


def is_hash_topic(context: VideoGenerationContext) -> bool:
    text = f"{context.current_node.name} {context.current_node.description or ''}".lower()
    return "哈希" in text or "散列" in text or "hash" in text


def deterministic_strategy(context: VideoGenerationContext) -> TeachingStrategy:
    style = (context.learner.cognitive_style or "mixed").lower()
    level = (
        context.learner.knowledge_base_level
        or context.current_node.difficulty
        or "medium"
    ).lower()
    has_real_mistake = bool(context.relevant_mistakes)

    if style == "diagram":
        entry_mode = "question"
        preferred = ["problem_hook", "process_flow", "concept_relationship", "zoom_focus", "summary_recall"]
        code_depth = "none"
        reasons = ["diagram learner: prioritize process, relationships and camera focus"]
    elif style == "example":
        entry_mode = "complete_example"
        preferred = ["problem_hook", "step_by_step", "data_structure_operation", "before_after", "summary_recall"]
        code_depth = "illustrative"
        reasons = ["example learner: enter through a complete worked case"]
    elif style == "code":
        entry_mode = "code_problem"
        preferred = ["problem_hook", "code_execution", "algorithm_trace", "data_structure_operation", "summary_recall"]
        code_depth = "implementation"
        reasons = ["code learner: require code execution and algorithm trace"]
    elif style == "text":
        entry_mode = "definition"
        preferred = ["problem_hook", "concept_relationship", "process_flow", "step_by_step", "summary_recall"]
        code_depth = "none"
        reasons = ["text learner: use structured definitions while retaining a dynamic process"]
    else:
        entry_mode = "question"
        preferred = ["problem_hook", "direct_mapping_demo", "process_flow", "step_by_step", "summary_recall"]
        code_depth = "illustrative"
        reasons = ["mixed learner: balance concrete mapping and process explanation"]

    if level == "easy":
        terminology_level = "plain"
        pacing = "slow"
        complexity = ["explain one state change at a time", "avoid unnecessary terminology"]
        reasons.append("easy level: reduce terminology and slow the pacing")
    elif level in {"hard", "challenge"}:
        terminology_level = "advanced"
        pacing = "fast"
        complexity = ["include boundary behavior", "include engineering implementation trade-offs"]
        reasons.append("advanced level: add complexity, boundaries and implementation detail")
        if code_depth == "none":
            code_depth = "illustrative"
    else:
        terminology_level = "standard"
        pacing = "steady"
        complexity = ["connect mechanism to one complete example"]

    if has_real_mistake:
        insert_at = max(1, len(preferred) - 1)
        preferred.insert(insert_at, "misconception_correction")
        reasons.append("real related mistake exists: include misconception correction")

    return TeachingStrategy(
        entry_mode=entry_mode,
        preferred_scene_types=preferred,
        terminology_level=terminology_level,
        pacing=pacing,
        code_depth=code_depth,
        include_misconception=has_real_mistake,
        complexity_notes=complexity,
        personalization_reasons=reasons,
    )


class TeachingStrategyPlanner:
    def __init__(self, llm_service: LLMService | None = None) -> None:
        self.llm_service = llm_service or LLMService()

    async def plan(self, context: VideoGenerationContext) -> TeachingStrategy:
        base = deterministic_strategy(context)
        prompt = (
            "你是教学策略规划器。只能在给定 JSON 结构内细化策略，不得添加身份信息、虚构学习行为或改变确定性要求。\n"
            f"上下文：{json.dumps(context.prompt_payload(), ensure_ascii=False)}\n"
            f"确定性基础策略：{base.model_dump_json()}\n"
            f"输出 JSON Schema：{json.dumps(TeachingStrategy.model_json_schema(), ensure_ascii=False)}"
        )
        try:
            candidate = TeachingStrategy.model_validate(
                await self.llm_service.generate_json(prompt, mock_data=base.model_dump())
            )
        except (RuntimeError, ValidationError, ValueError):
            return base

        required = list(base.preferred_scene_types)
        refined = [item for item in candidate.preferred_scene_types if item in required]
        for item in required:
            if item not in refined:
                refined.append(item)
        return candidate.model_copy(
            update={
                "entry_mode": base.entry_mode,
                "preferred_scene_types": refined,
                "terminology_level": base.terminology_level,
                "pacing": base.pacing,
                "code_depth": base.code_depth,
                "include_misconception": base.include_misconception,
                "personalization_reasons": base.personalization_reasons,
            }
        )


def deterministic_narrative(
    context: VideoGenerationContext,
    strategy: TeachingStrategy,
) -> VideoNarrative:
    node = context.current_node.name
    mistake = context.relevant_mistakes[0] if context.relevant_mistakes else None
    sections = [
        NarrativeSection(
            role="hook",
            title="先看一个查找问题",
            teaching_objective=f"用可观察的问题建立学习 {node} 的动机",
            key_points=[f"为什么 {node} 能避免无效步骤"],
        ),
        NarrativeSection(
            role="definition",
            title="建立核心映射",
            teaching_objective=f"给出 {node} 的结构化定义",
            key_points=["输入对象", "转换规则", "目标位置"],
        ),
        NarrativeSection(
            role="mechanism",
            title="跟踪状态变化",
            teaching_objective="把规则落实为逐步、可辨识的状态变化",
            key_points=["当前状态", "执行动作", "新状态"],
        ),
    ]
    if mistake:
        sections.append(
            NarrativeSection(
                role="comparison",
                title="纠正真实易错点",
                teaching_objective="只针对已有学习证据纠正误解",
                key_points=[mistake],
                evidence_mistake=mistake,
            )
        )
    sections.extend(
        [
            NarrativeSection(
                role="example",
                title="完成一个完整案例",
                teaching_objective="让学习者在新输入上复现完整过程",
                key_points=["预测", "执行", "核对"],
            ),
            NarrativeSection(
                role="summary",
                title="按过程回忆",
                teaching_objective="用动作链而不是孤立术语完成总结",
                key_points=["对象", "规则", "状态变化", "结果"],
            ),
        ]
    )
    return VideoNarrative(title=f"{node}：从规则到过程", sections=sections)


class NarrativePlanner:
    def __init__(self, llm_service: LLMService | None = None) -> None:
        self.llm_service = llm_service or LLMService()

    async def plan(
        self,
        context: VideoGenerationContext,
        strategy: TeachingStrategy,
    ) -> VideoNarrative:
        fallback = deterministic_narrative(context, strategy)
        prompt = (
            "你是教学叙事规划器。输出严格 JSON。必须从 hook 开始、summary 结束，并按顺序包含 definition、mechanism、example。"
            "只有上下文有真实相关错因时才能加入 misconception 内容；不得编造学习行为。\n"
            f"上下文：{json.dumps(context.prompt_payload(), ensure_ascii=False)}\n"
            f"策略：{strategy.model_dump_json()}\n"
            f"Schema：{json.dumps(VideoNarrative.model_json_schema(), ensure_ascii=False)}"
        )
        try:
            return VideoNarrative.model_validate(
                await self.llm_service.generate_json(prompt, mock_data=fallback.model_dump())
            )
        except (RuntimeError, ValidationError, ValueError):
            return fallback


def _generic_scene(
    index: int,
    *,
    role: str,
    scene_type: str,
    title: str,
    purpose: str,
    narration: str,
    label: str,
) -> StoryboardScene:
    token_id = f"token_{index}"
    callout_id = f"callout_{index}"
    return StoryboardScene.model_validate(
        {
            "id": f"scene_{index:02d}",
            "narrative_role": role,
            "scene_type": scene_type,
            "title": title,
            "teaching_purpose": purpose,
            "narration": narration,
            "screen_text": [title, label],
            "actors": [
                {"id": token_id, "kind": "data_token", "slot": "left", "label": "输入", "value": label},
                {"id": callout_id, "kind": "callout", "slot": "right", "text": purpose, "tone": "result"},
            ],
            "beats": [
                {"id": f"beat_{index}_a", "start_ratio": 0.05, "end_ratio": 0.35, "action": "appear", "targets": [token_id]},
                {"id": f"beat_{index}_b", "start_ratio": 0.28, "end_ratio": 0.72, "action": "move", "targets": [token_id], "emphasis": label},
                {"id": f"beat_{index}_c", "start_ratio": 0.68, "end_ratio": 0.95, "action": "reveal", "targets": [callout_id]},
            ],
            "transition_out": {"type": "fade_through_background"},
            "claims": [],
            "source_ids": [],
        }
    )


def generic_fallback_storyboard(
    context: VideoGenerationContext,
    strategy: TeachingStrategy,
) -> VideoStoryboard:
    node = context.current_node.name
    mechanism_type = "code_execution" if strategy.code_depth == "implementation" else "process_flow"
    example_type = "algorithm_trace" if strategy.code_depth != "none" else "data_structure_operation"
    scenes = [
        _generic_scene(
            1,
            role="hook",
            scene_type="problem_hook",
            title="问题从哪里开始",
            purpose="先观察低效步骤",
            narration=f"面对 {node}，先看一个直接问题：哪些步骤真正帮助我们得到结果？",
            label="待处理输入",
        ),
        _generic_scene(
            2,
            role="definition",
            scene_type="concept_relationship",
            title="对象与规则",
            purpose="建立对象、规则和结果的关系",
            narration=f"理解 {node} 时，把输入对象、处理规则和输出结果连成一条清晰关系。",
            label="对象 → 规则",
        ),
        _generic_scene(
            3,
            role="mechanism",
            scene_type=mechanism_type,
            title="状态逐步变化",
            purpose="跟踪规则怎样改变状态",
            narration="每执行一步，都对照旧状态、当前动作和新状态，不让过程只剩下结论。",
            label="旧状态 → 新状态",
        ),
        _generic_scene(
            4,
            role="example",
            scene_type=example_type,
            title="完整案例验证",
            purpose="在具体输入上复现机制",
            narration="现在换一个具体输入，先预测下一步，再执行规则，最后核对状态和结果。",
            label="预测 → 执行 → 核对",
        ),
        _generic_scene(
            5,
            role="summary",
            scene_type="summary_recall",
            title="按动作链回忆",
            purpose="回忆对象、规则、状态和结果",
            narration=f"回忆 {node}：先找对象，再应用规则，观察状态变化，最后确认输出结果。",
            label="对象 → 规则 → 状态 → 结果",
        ),
    ]
    return VideoStoryboard(title=f"{node} 个性化讲解", scenes=scenes)


def hash_fallback_storyboard(
    context: VideoGenerationContext,
    strategy: TeachingStrategy,
    target_duration_seconds: float | None = None,
) -> VideoStoryboard:
    style_note = "先用图形过程理解" if strategy.code_depth == "none" else "同时观察取模代码怎样执行"
    scenes = [
        StoryboardScene(
            id="scene_01",
            narrative_role="hook",
            scene_type="problem_hook",
            title="一定要从 #0 开始吗",
            teaching_purpose="用 100 个位置和扫描光标建立问题",
            narration="这里有一百个位置。查找一个 key 时，我们真的必须从零号位置逐项扫描吗？",
            screen_text=["100 个位置", "必须从 #0 开始？"],
            actors=[
                ComparisonLaneActor(id="scan_lane", kind="comparison_lane", slot="stage", title="逐项扫描", items=[str(i) for i in range(100)]),
                CounterActor(id="scan_counter", kind="counter", slot="top", label="已检查", start=0, end=100, suffix=" 个"),
            ],
            beats=[
                Beat(id="scan_appear", start_ratio=0.05, end_ratio=0.25, action="appear", targets=["scan_lane"]),
                Beat(id="scan_move", start_ratio=0.2, end_ratio=0.82, action="follow_path", targets=["scan_lane"]),
                Beat(id="scan_count", start_ratio=0.2, end_ratio=0.82, action="count", targets=["scan_counter"], emphasis="逐项检查"),
            ],
            transition_out=SceneTransition(type="directional_slide", direction="left"),
        ),
        StoryboardScene(
            id="scene_02",
            narrative_role="definition",
            scene_type="direct_mapping_demo",
            title="从 Key 直接算位置",
            teaching_purpose="展示 12836 经过取模得到 36",
            narration=f"换一种方法：把一二八三六送入哈希函数，计算一二八三六对一百取模，结果是三十六。{style_note}。",
            screen_text=["12836 → Hash Function", "12836 % 100 = 36"],
            actors=[
                KeyActor(id="key_12836", kind="key", slot="left", label="Key", value="12836", continuity_key="lookup_key"),
                FormulaActor(id="hash_formula", kind="formula", slot="center", label="Hash Function", expression="12836 % 100", steps=["12836", "% 100", "= 36"]),
                BucketRowActor(id="bucket_row", kind="bucket_row", slot="right", label="Buckets", bucket_count=100, focus_indices=[36], continuity_key="buckets"),
            ],
            beats=[
                Beat(id="key_into_hash", start_ratio=0.05, end_ratio=0.35, action="move", targets=["key_12836"], emphasis="12836"),
                Beat(id="formula_steps", start_ratio=0.28, end_ratio=0.7, action="type", targets=["hash_formula"], emphasis="% 100"),
                Beat(id="result_36", start_ratio=0.65, end_ratio=0.95, action="highlight", targets=["bucket_row"], emphasis="#36"),
            ],
            transition_out=SceneTransition(type="object_continuity", continuity_actor_id="bucket_row"),
        ),
        StoryboardScene(
            id="scene_03",
            narrative_role="mechanism",
            scene_type="zoom_focus",
            title="镜头定位到 #36",
            teaching_purpose="从整体桶数组聚焦 #34 到 #37 并让 key 落桶",
            narration="镜头从整个表移动到三十四至三十七号桶，锁定三十六号位置，key 随即落入目标桶。",
            screen_text=["#34  #35  #36  #37", "定位 #36"],
            actors=[
                BucketRowActor(id="bucket_zoom", kind="bucket_row", slot="stage", label="Buckets #34–#37", bucket_count=100, focus_indices=[34, 35, 36, 37], continuity_key="buckets"),
                KeyActor(id="key_drop", kind="key", slot="top", label="Key", value="12836", continuity_key="lookup_key"),
            ],
            beats=[
                Beat(id="camera_to_range", start_ratio=0.05, end_ratio=0.42, action="camera", targets=["bucket_zoom"], emphasis="#34–#37"),
                Beat(id="focus_36", start_ratio=0.38, end_ratio=0.68, action="highlight", targets=["bucket_zoom"], emphasis="#36"),
                Beat(id="drop_key", start_ratio=0.62, end_ratio=0.95, action="move", targets=["key_drop"], emphasis="直接定位"),
            ],
            transition_out=SceneTransition(type="fade_through_background"),
        ),
        StoryboardScene(
            id="scene_04",
            narrative_role="comparison",
            scene_type="compare_race",
            title="两种查找同时起跑",
            teaching_purpose="并行比较逐项扫描与哈希定位的检查次数",
            narration="两种查找同时开始。线性查找逐项前进，哈希查找直接定位。哈希查找在平均情况下接近 O(1)。",
            screen_text=["Linear Search vs Hash Lookup", "平均情况下接近 O(1)"],
            actors=[
                ComparisonLaneActor(id="linear_lane", kind="comparison_lane", slot="left_lane", title="Linear Search", items=[str(i) for i in range(100)]),
                ComparisonLaneActor(id="hash_lane", kind="comparison_lane", slot="right_lane", title="Hash Lookup", items=["Key", "Hash", "#36"]),
                CounterActor(id="linear_count", kind="counter", slot="left", label="检查次数", start=0, end=37, suffix=" 次"),
                CounterActor(id="hash_count", kind="counter", slot="right", label="检查次数", start=0, end=1, suffix=" 次"),
            ],
            beats=[
                Beat(id="race_start", start_ratio=0.05, end_ratio=0.2, action="appear", targets=["linear_lane", "hash_lane"]),
                Beat(id="linear_run", start_ratio=0.18, end_ratio=0.85, action="count", targets=["linear_count"], emphasis="37 次"),
                Beat(id="hash_jump", start_ratio=0.18, end_ratio=0.42, action="count", targets=["hash_count"], emphasis="1 次"),
                Beat(id="average_o1", start_ratio=0.72, end_ratio=0.96, action="reveal", targets=["hash_lane"], emphasis="平均 O(1)"),
            ],
            transition_out=SceneTransition(type="fade_through_background"),
            claims=["哈希表查找在平均情况下接近 O(1)"],
        ),
        StoryboardScene(
            id="scene_05",
            narrative_role="example",
            scene_type="collision_demo",
            title="同一个桶，不等于覆盖",
            teaching_purpose="演示 16750 与 20950 同到 #50 后使用链地址法",
            narration="一六七五零和二零九五零都映射到五十号桶。它们先暂停并发生冲突，再展开为一六七五零指向二零九五零。冲突不等于覆盖。",
            screen_text=["16750 % 100 = 50", "20950 % 100 = 50", "冲突 ≠ 覆盖"],
            actors=[
                KeyActor(id="key_16750", kind="key", slot="left", label="Key", value="16750"),
                KeyActor(id="key_20950", kind="key", slot="right", label="Key", value="20950"),
                BucketRowActor(id="collision_bucket", kind="bucket_row", slot="center", label="Bucket #50", bucket_count=100, focus_indices=[50]),
                CalloutActor(id="collision_chain", kind="callout", slot="bottom", text="16750 → 20950", tone="result"),
            ],
            beats=[
                Beat(id="first_to_50", start_ratio=0.05, end_ratio=0.38, action="move", targets=["key_16750"], emphasis="#50"),
                Beat(id="second_to_50", start_ratio=0.2, end_ratio=0.52, action="move", targets=["key_20950"], emphasis="#50"),
                Beat(id="collision_pause", start_ratio=0.48, end_ratio=0.66, action="collision", targets=["key_16750", "key_20950"], emphasis="冲突"),
                Beat(id="chain_reveal", start_ratio=0.64, end_ratio=0.95, action="reveal", targets=["collision_chain"], emphasis="冲突 ≠ 覆盖"),
            ],
            transition_out=SceneTransition(type="fade_through_background"),
            claims=["链地址法可以在同一桶中保留多个发生哈希冲突的 key"],
        ),
        StoryboardScene(
            id="scene_06",
            narrative_role="summary",
            scene_type="summary_recall",
            title="四步回忆哈希查找",
            teaching_purpose="逐步回忆 Key、Hash、Bucket 与局部处理",
            narration="最后回忆：Key 先经过 Hash 得到 Bucket，再在桶内做局部处理。因此，哈希表通过计算直接缩小查找范围，在平均情况下接近 O(1)，冲突则在桶内继续处理。",
            screen_text=["Key → Hash → Bucket → Local handling", "直接缩小范围；冲突在桶内处理"],
            actors=[
                CalloutActor(id="recall_key", kind="callout", slot="left", text="Key", tone="neutral"),
                CalloutActor(id="recall_hash", kind="callout", slot="center", text="Hash", tone="neutral"),
                CalloutActor(id="recall_bucket", kind="callout", slot="right", text="Bucket", tone="positive"),
                CalloutActor(id="recall_local", kind="callout", slot="bottom", text="Local handling", tone="result"),
            ],
            beats=[
                Beat(id="recall_1", start_ratio=0.05, end_ratio=0.28, action="reveal", targets=["recall_key"]),
                Beat(id="recall_2", start_ratio=0.24, end_ratio=0.48, action="reveal", targets=["recall_hash"]),
                Beat(id="recall_3", start_ratio=0.44, end_ratio=0.7, action="reveal", targets=["recall_bucket"]),
                Beat(id="recall_4", start_ratio=0.66, end_ratio=0.95, action="reveal", targets=["recall_local"], emphasis="平均 O(1)"),
            ],
            transition_out=SceneTransition(type="fade_through_background"),
            claims=["哈希表通过计算直接缩小查找范围，在平均情况下接近 O(1)"],
        ),
    ]

    extension_count = (
        max(0, min(4, round((target_duration_seconds - 61) / 14)))
        if target_duration_seconds is not None
        else 0
    )
    if extension_count:
        extended_scenes = [
            StoryboardScene(
                id="scene_07",
                narrative_role="mechanism",
                scene_type="process_flow",
                title="桶号只是第一层定位",
                teaching_purpose="解释定位桶后仍需核对原始 key",
                narration="桶号只是第一层定位。进入三十六号桶后，还要在桶内比较原始 key；只有 key 相等时，才返回它对应的 value。这样既缩小了范围，也避免把同桶元素误认为同一个元素。",
                screen_text=["先定位 Bucket #36", "再核对原始 Key", "命中后返回 Value"],
                actors=[
                    KeyActor(id="lookup_key", kind="key", slot="left", label="Key", value="12836"),
                    BucketRowActor(id="lookup_bucket", kind="bucket_row", slot="center", label="Bucket #36", bucket_count=100, focus_indices=[36]),
                    CalloutActor(id="key_check", kind="callout", slot="right", text="原始 Key 相等？", tone="neutral"),
                    DataTokenActor(id="lookup_value", kind="data_token", slot="bottom", label="Value", value="命中结果"),
                ],
                beats=[
                    Beat(id="locate_bucket", start_ratio=0.05, end_ratio=0.34, action="move", targets=["lookup_key", "lookup_bucket"], emphasis="#36"),
                    Beat(id="compare_original_key", start_ratio=0.3, end_ratio=0.68, action="highlight", targets=["key_check"], emphasis="比较 Key"),
                    Beat(id="return_value", start_ratio=0.64, end_ratio=0.95, action="reveal", targets=["lookup_value"], emphasis="返回 Value"),
                ],
                transition_out=SceneTransition(type="fade_through_background"),
                claims=["哈希表定位桶后仍需比较原始 key 才能确认命中"],
            ),
            StoryboardScene(
                id="scene_08",
                narrative_role="process",
                scene_type="before_after",
                title="平均 O(1) 有前提",
                teaching_purpose="说明均匀散列与合理装载是平均常数查找的条件",
                narration="平均 O(1) 不是无条件保证。它依赖哈希函数把 key 尽量均匀地分散，同时桶的数量要和元素数量保持合理比例。若大量 key 挤进同一个桶，桶内比较就会越来越长。",
                screen_text=["均匀散列", "合理装载因子", "冲突集中会变慢"],
                actors=[
                    ComparisonLaneActor(id="balanced_buckets", kind="comparison_lane", slot="left_lane", title="分布均匀", items=["#12: 1", "#36: 1", "#50: 2"]),
                    ComparisonLaneActor(id="crowded_bucket", kind="comparison_lane", slot="right_lane", title="冲突集中", items=["#50: 1", "#50: 2", "#50: 3", "#50: 4"]),
                    CalloutActor(id="average_condition", kind="callout", slot="bottom", text="均匀 + 合理装载 → 平均接近 O(1)", tone="result"),
                ],
                beats=[
                    Beat(id="show_balanced", start_ratio=0.05, end_ratio=0.36, action="appear", targets=["balanced_buckets"], emphasis="分布均匀"),
                    Beat(id="show_crowded", start_ratio=0.3, end_ratio=0.68, action="grow", targets=["crowded_bucket"], emphasis="冲突集中"),
                    Beat(id="show_condition", start_ratio=0.64, end_ratio=0.95, action="reveal", targets=["average_condition"], emphasis="平均 O(1) 的条件"),
                ],
                transition_out=SceneTransition(type="fade_through_background"),
                claims=["哈希表平均 O(1) 依赖较均匀的哈希分布和合理的装载因子"],
            ),
            StoryboardScene(
                id="scene_09",
                narrative_role="process",
                scene_type="timeline",
                title="元素增多后为什么要扩容",
                teaching_purpose="展示装载升高、冲突增加和扩容重分布的过程",
                narration="随着元素增多，装载因子会升高，冲突通常也会增加。工程实现会在达到阈值时扩容，并重新计算元素所在的桶，用更多可用桶换回更短的桶内查找。",
                screen_text=["元素增多", "冲突增加", "扩容并重新分桶"],
                actors=[
                    CounterActor(id="load_factor", kind="counter", slot="left", label="装载因子", start=20, end=80, suffix="%"),
                    BucketRowActor(id="before_resize", kind="bucket_row", slot="center", label="扩容前", bucket_count=8, focus_indices=[2, 5]),
                    BucketRowActor(id="after_resize", kind="bucket_row", slot="right", label="扩容后", bucket_count=16, focus_indices=[2, 5, 10]),
                    CalloutActor(id="redistribute", kind="callout", slot="bottom", text="重新计算桶索引", tone="positive"),
                ],
                beats=[
                    Beat(id="load_rises", start_ratio=0.05, end_ratio=0.34, action="count", targets=["load_factor"], emphasis="装载升高"),
                    Beat(id="resize_table", start_ratio=0.3, end_ratio=0.7, action="grow", targets=["before_resize", "after_resize"], emphasis="8 → 16 个桶"),
                    Beat(id="rehash_keys", start_ratio=0.66, end_ratio=0.95, action="reveal", targets=["redistribute"], emphasis="重新分桶"),
                ],
                transition_out=SceneTransition(type="fade_through_background"),
                claims=["装载因子升高时，扩容并重新分桶有助于减少冲突"],
            ),
            StoryboardScene(
                id="scene_10",
                narrative_role="example",
                scene_type="algorithm_trace",
                title="沿冲突链找到第二个 key",
                teaching_purpose="完整追踪冲突链中的局部查找",
                narration="现在查找二零九五零。先计算得到五十号桶，再比较第一个节点一六七五零，发现 key 不相等，于是沿冲突链继续；第二个节点 key 匹配，查找才真正完成。",
                screen_text=["定位 Bucket #50", "16750 ≠ 20950", "继续到 20950：命中"],
                actors=[
                    CodePanelActor(id="chain_lookup", kind="code_panel", slot="left", language="python", label="桶内查找", code_lines=["index = 20950 % 100", "compare(16750)", "compare(20950)", "return value"]),
                    VariablePanelActor(id="chain_state", kind="variable_panel", slot="right", label="查找状态", variables={"bucket": "50", "current": "16750", "target": "20950"}),
                    CalloutActor(id="chain_hit", kind="callout", slot="bottom", text="第二个节点命中", tone="result"),
                ],
                beats=[
                    Beat(id="trace_bucket_50", start_ratio=0.05, end_ratio=0.32, action="code_highlight", targets=["chain_lookup", "chain_state"], emphasis="Bucket #50"),
                    Beat(id="trace_first_node", start_ratio=0.28, end_ratio=0.62, action="state_transition", targets=["chain_state"], emphasis="16750 不匹配"),
                    Beat(id="trace_second_node", start_ratio=0.58, end_ratio=0.95, action="reveal", targets=["chain_lookup", "chain_hit"], emphasis="20950 命中"),
                ],
                transition_out=SceneTransition(type="fade_through_background"),
                claims=["链地址法查找会在目标桶内逐个比较 key 直到命中或链结束"],
            ),
        ]
        scenes.insert(3, extended_scenes[0])
        if extension_count > 1:
            example_index = next(
                index for index, scene in enumerate(scenes) if scene.narrative_role == "example"
            )
            scenes[example_index:example_index] = extended_scenes[1:min(extension_count, 3)]
        if extension_count > 3:
            scenes.insert(-1, extended_scenes[3])

    if strategy.code_depth == "implementation":
        scenes.insert(
            2,
            StoryboardScene(
                id="scene_03",
                narrative_role="mechanism",
                scene_type="code_execution",
                title="取模代码如何执行",
                teaching_purpose="从实现层跟踪 key、capacity 与 index",
                narration="在实现层，索引由哈希值对容量取模得到。还要关注装载因子与扩容，否则冲突增多，最坏情况会退化。",
                screen_text=["index = hash(key) % capacity", "装载因子与扩容"],
                actors=[
                    CodePanelActor(
                        id="hash_code",
                        kind="code_panel",
                        slot="left",
                        language="python",
                        label="hash lookup implementation",
                        code_lines=["index = hash(key) % capacity", "bucket = table[index]", "return find(bucket, key)"],
                    ),
                    VariablePanelActor(
                        id="hash_variables",
                        kind="variable_panel",
                        slot="right",
                        label="runtime state",
                        variables={"key": "12836", "capacity": "100", "index": "36"},
                    ),
                ],
                beats=[
                    Beat(id="code_line_1", start_ratio=0.05, end_ratio=0.38, action="code_highlight", targets=["hash_code"], emphasis="hash(key)"),
                    Beat(id="code_line_2", start_ratio=0.34, end_ratio=0.68, action="code_highlight", targets=["hash_code"], emphasis="index = 36"),
                    Beat(id="variable_state", start_ratio=0.62, end_ratio=0.95, action="state_transition", targets=["hash_variables"], emphasis="capacity"),
                ],
                transition_out=SceneTransition(type="fade_through_background"),
            ),
        )
        scenes.insert(
            len(scenes) - 1,
            StoryboardScene(
                id="scene_07",
                narrative_role="process",
                scene_type="algorithm_trace",
                title="桶内查找与边界",
                teaching_purpose="跟踪冲突桶内的局部查找和最坏退化边界",
                narration="完整追踪时，先计算桶索引，再在局部链中比较 key。平均查找接近常数，但冲突集中时仍可能退化。",
                screen_text=["hash → bucket → local find", "平均快，最坏可退化"],
                actors=[
                    CodePanelActor(
                        id="local_find_code",
                        kind="code_panel",
                        slot="left",
                        language="python",
                        label="bucket trace",
                        code_lines=["index = hash(key) % capacity", "for entry in table[index]:", "    if entry.key == key: return entry"],
                    ),
                    CalloutActor(id="trace_average", kind="callout", slot="right", text="平均：接近 O(1)", tone="positive"),
                    CalloutActor(id="trace_worst", kind="callout", slot="bottom", text="冲突集中：可能退化", tone="warning"),
                ],
                beats=[
                    Beat(id="trace_index", start_ratio=0.05, end_ratio=0.35, action="code_highlight", targets=["local_find_code"], emphasis="index"),
                    Beat(id="trace_bucket", start_ratio=0.3, end_ratio=0.68, action="code_highlight", targets=["local_find_code"], emphasis="local find"),
                    Beat(id="trace_boundary", start_ratio=0.64, end_ratio=0.95, action="reveal", targets=["trace_average", "trace_worst"], emphasis="最坏退化"),
                ],
                transition_out=SceneTransition(type="fade_through_background"),
                claims=["哈希表平均查找接近 O(1)，冲突集中时可能退化"],
            ),
        )
    for index, scene in enumerate(scenes, start=1):
        scene.id = f"scene_{index:02d}"
    source_ids = [item.source_id for item in context.rag_evidence[:5]]
    if source_ids:
        for scene in scenes:
            if scene.claims:
                scene.source_ids = source_ids
    return VideoStoryboard(title="为什么哈希表不需要逐项查找？", scenes=scenes)


def fallback_storyboard(
    context: VideoGenerationContext,
    strategy: TeachingStrategy,
    target_duration_seconds: float | None = None,
) -> VideoStoryboard:
    if is_hash_topic(context):
        return hash_fallback_storyboard(context, strategy, target_duration_seconds)
    return generic_fallback_storyboard(context, strategy)


class StoryboardValidator:
    def validate(
        self,
        raw: dict[str, Any],
        context: VideoGenerationContext,
    ) -> VideoStoryboard:
        storyboard = VideoStoryboard.model_validate(raw)
        if not context.relevant_mistakes and any(
            scene.scene_type == "misconception_correction" for scene in storyboard.scenes
        ):
            raise ValueError("misconception correction requires a real related mistake")
        known_sources = {item.source_id for item in context.rag_evidence}
        referenced_sources = {source_id for scene in storyboard.scenes for source_id in scene.source_ids}
        unknown_sources = referenced_sources - known_sources
        if unknown_sources:
            raise ValueError(f"storyboard references unknown RAG sources: {sorted(unknown_sources)}")
        return storyboard


class StoryboardPlanner:
    def __init__(
        self,
        llm_service: LLMService | None = None,
        validator: StoryboardValidator | None = None,
    ) -> None:
        self.llm_service = llm_service or LLMService()
        self.validator = validator or StoryboardValidator()

    async def generate(
        self,
        context: VideoGenerationContext,
        strategy: TeachingStrategy,
        narrative: VideoNarrative,
        target_duration_seconds: float | None = None,
    ) -> tuple[dict[str, Any], ValidatedStoryboard]:
        fallback = fallback_storyboard(context, strategy, target_duration_seconds)
        if is_hash_topic(context):
            return fallback.model_dump(), ValidatedStoryboard(
                storyboard=fallback,
                validation_notes=["deterministic hash acceptance storyboard enforced"],
            )
        prompt = self._prompt(context, strategy, narrative, target_duration_seconds)
        try:
            raw = await self.llm_service.generate_json(prompt, mock_data=fallback.model_dump())
        except (RuntimeError, ValueError):
            return fallback.model_dump(), ValidatedStoryboard(
                storyboard=fallback,
                fallback_used=True,
                validation_notes=["storyboard LLM failed; deterministic fallback used"],
            )

        try:
            storyboard = self.validator.validate(raw, context)
            return raw, ValidatedStoryboard(storyboard=storyboard)
        except (ValidationError, ValueError) as first_error:
            repair_prompt = (
                "修复下列 Scene DSL JSON。只允许修复一次；保持教学事实，不得输出解释。\n"
                f"校验错误：{first_error}\n"
                f"原 JSON：{json.dumps(raw, ensure_ascii=False)}\n"
                f"Schema：{json.dumps(VideoStoryboard.model_json_schema(), ensure_ascii=False)}"
            )
            try:
                repaired_raw = await self.llm_service.generate_json(
                    repair_prompt,
                    mock_data=fallback.model_dump(),
                    temperature=0,
                )
                repaired = self.validator.validate(repaired_raw, context)
                return raw, ValidatedStoryboard(
                    storyboard=repaired,
                    repaired=True,
                    validation_notes=[str(first_error)],
                )
            except (RuntimeError, ValidationError, ValueError) as repair_error:
                return raw, ValidatedStoryboard(
                    storyboard=fallback,
                    fallback_used=True,
                    validation_notes=[str(first_error), str(repair_error)],
                )

    @staticmethod
    def _prompt(
        context: VideoGenerationContext,
        strategy: TeachingStrategy,
        narrative: VideoNarrative,
        target_duration_seconds: float | None = None,
    ) -> str:
        duration_requirement = (
            f"目标总时长 {target_duration_seconds:.0f} 秒，按每个场景约 8 到 14 秒安排足够场景；"
            f"预计总时长必须在 {target_duration_seconds * 0.85:.0f} 到 {target_duration_seconds * 1.15:.0f} 秒之间。\n"
            if target_duration_seconds is not None
            else ""
        )
        return (
            "你是教学视频 Storyboard Director。只输出严格 Scene DSL JSON，不得输出组件名、HTML、JSX、CSS、"
            "绝对坐标、Markdown 或自由代码。演员、动作、槽位和转场只能使用 Schema 枚举。每场景必须有教学性视觉事件；"
            "动作 target 必须引用同场景 actor id，时间使用 0..1 的 start_ratio/end_ratio。\n"
            f"上下文：{json.dumps(context.prompt_payload(), ensure_ascii=False)}\n"
            f"策略：{strategy.model_dump_json()}\n"
            f"Narrative：{narrative.model_dump_json()}\n"
            f"时长要求：{duration_requirement}"
            f"Schema：{json.dumps(VideoStoryboard.model_json_schema(), ensure_ascii=False)}"
        )

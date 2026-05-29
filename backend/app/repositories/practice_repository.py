from app.schemas.practice import PracticeQuestion, PracticeRecord

DEMO_TIME = "2026-05-28T10:00:00Z"


class PracticeRepository:
    def __init__(self) -> None:
        self._questions: dict[str, PracticeQuestion] = {}
        self._records: dict[str, PracticeRecord] = {}
        self._record_ids_by_user_id: dict[str, list[str]] = {}
        self._wrong_question_ids_by_user_id: dict[str, list[str]] = {}
        self._question_counter = 0
        self._record_counter = 0

    def next_question_id(self, question_type: str) -> str:
        self._question_counter += 1
        return f"question_{question_type}_mock_{self._question_counter:03d}"

    def next_record_id(self) -> str:
        self._record_counter += 1
        return f"practice_record_mock_{self._record_counter:03d}"

    def save_questions(self, questions: list[PracticeQuestion]) -> list[PracticeQuestion]:
        for question in questions:
            self._questions[question.id] = question.model_copy(deep=True)
        return [question.model_copy(deep=True) for question in questions]

    def save_question(self, question: PracticeQuestion) -> PracticeQuestion:
        self._questions[question.id] = question.model_copy(deep=True)
        return question.model_copy(deep=True)

    def get_question(self, question_id: str) -> PracticeQuestion | None:
        question = self._questions.get(question_id)
        return question.model_copy(deep=True) if question is not None else None

    def list_questions(self, keyword: str | None = None) -> list[PracticeQuestion]:
        questions = [question.model_copy(deep=True) for question in self._questions.values()]
        if keyword:
            questions = [
                question
                for question in questions
                if keyword in question.title or keyword in question.content
            ]
        return questions

    def save_record(self, record: PracticeRecord) -> PracticeRecord:
        self._records[record.id] = record.model_copy(deep=True)
        self._record_ids_by_user_id.setdefault(record.user_id, []).append(record.id)
        return record.model_copy(deep=True)

    def list_records_by_user_id(self, user_id: str) -> list[PracticeRecord]:
        return [
            self._records[record_id].model_copy(deep=True)
            for record_id in self._record_ids_by_user_id.get(user_id, [])
            if record_id in self._records
        ]

    def add_wrong_question(self, user_id: str, question_id: str) -> None:
        question_ids = self._wrong_question_ids_by_user_id.setdefault(user_id, [])
        if question_id not in question_ids:
            question_ids.append(question_id)

    def list_wrong_questions(self, user_id: str) -> list[PracticeQuestion]:
        return [
            self._questions[question_id].model_copy(deep=True)
            for question_id in self._wrong_question_ids_by_user_id.get(user_id, [])
            if question_id in self._questions
        ]

    def remove_wrong_question(self, user_id: str, question_id: str) -> bool:
        question_ids = self._wrong_question_ids_by_user_id.get(user_id, [])
        if question_id not in question_ids:
            return False
        question_ids.remove(question_id)
        return True


default_practice_repository = PracticeRepository()

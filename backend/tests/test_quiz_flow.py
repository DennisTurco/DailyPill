def _make_topic_with_question(client):
    topic = client.post("/topics", json={"name": "Quiz Topic"}).json()
    client.post(
        "/questions",
        json={
            "topic_id": topic["id"],
            "type": "multiple_choice",
            "text": "2 + 2 = ?",
            "options": ["3", "4", "5", "6"],
            "correct_answer": "4",
            "difficulty": 2,
        },
    )
    return topic


def test_quiz_start_submit_finish(client):
    topic = _make_topic_with_question(client)

    start_response = client.post("/quiz/start", json={"topic_id": topic["id"], "question_count": 5})
    assert start_response.status_code == 200
    session_data = start_response.json()
    assert len(session_data["questions"]) == 1
    question = session_data["questions"][0]

    submit_response = client.post(
        f"/quiz/{session_data['session_id']}/submit",
        json={"answers": [{"question_id": question["id"], "given_answer": "4"}]},
    )
    assert submit_response.status_code == 200
    assert submit_response.json()["answers"][0]["is_correct"] is True

    finish_response = client.post(f"/quiz/{session_data['session_id']}/finish")
    assert finish_response.status_code == 200
    finish_data = finish_response.json()
    assert finish_data["total_score"] == 1.0
    assert finish_data["session"]["completed_at"] is not None


def test_progress_endpoint_returns_summary(client):
    topic = _make_topic_with_question(client)
    start_response = client.post("/quiz/start", json={"topic_id": topic["id"], "question_count": 5}).json()
    question = start_response["questions"][0]
    client.post(
        f"/quiz/{start_response['session_id']}/submit",
        json={"answers": [{"question_id": question["id"], "given_answer": "wrong"}]},
    )
    client.post(f"/quiz/{start_response['session_id']}/finish")

    progress_response = client.get("/progress")
    assert progress_response.status_code == 200
    data = progress_response.json()
    assert data["total_answers"] >= 1
    assert any(t["topic_id"] == topic["id"] for t in data["by_topic"])

def test_create_and_list_topic(client):
    response = client.post("/topics", json={"name": "Storia italiana", "category": "Storia"})
    assert response.status_code == 201
    topic = response.json()
    assert topic["name"] == "Storia italiana"

    list_response = client.get("/topics")
    assert list_response.status_code == 200
    assert any(t["id"] == topic["id"] for t in list_response.json())


def test_soft_delete_topic_excludes_from_list(client):
    created = client.post("/topics", json={"name": "Temp Topic"}).json()
    delete_response = client.delete(f"/topics/{created['id']}")
    assert delete_response.status_code == 204

    list_response = client.get("/topics")
    assert all(t["id"] != created["id"] for t in list_response.json())


def test_create_question_and_random_pull(client):
    topic = client.post("/topics", json={"name": "C# avanzato"}).json()
    question_payload = {
        "topic_id": topic["id"],
        "type": "multiple_choice",
        "text": "Cos'e LINQ?",
        "options": ["A query lang", "A CSS lib", "A DB", "None"],
        "correct_answer": "A query lang",
        "difficulty": 3,
    }
    create_response = client.post("/questions", json=question_payload)
    assert create_response.status_code == 201

    random_response = client.get("/questions/random", params={"topic_id": topic["id"], "count": 5})
    assert random_response.status_code == 200
    assert len(random_response.json()) == 1


def test_question_soft_delete_never_hard_deletes(client):
    topic = client.post("/topics", json={"name": "Test Topic"}).json()
    question = client.post(
        "/questions",
        json={
            "topic_id": topic["id"],
            "type": "single_word",
            "text": "Capitale d'Italia?",
            "correct_answer": "Roma",
            "difficulty": 1,
        },
    ).json()

    delete_response = client.delete(f"/questions/{question['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/questions/{question['id']}")
    assert get_response.status_code == 404


def test_daily_info_fact_is_idempotent_within_same_day(client):
    topic = client.post(
        "/topics", json={"name": "SOLID principles", "is_informational": True}
    ).json()
    assert topic["is_informational"] is True

    fact = client.post(
        "/info-facts",
        json={
            "topic_id": topic["id"],
            "title": "Single Responsibility Principle",
            "description": "A class should have only one reason to change.",
            "link": "https://example.com/srp",
        },
    ).json()

    first_response = client.get("/info-facts/daily")
    assert first_response.status_code == 200
    first_fact = first_response.json()
    assert first_fact["id"] == fact["id"]

    second_response = client.get("/info-facts/daily")
    assert second_response.status_code == 200
    second_fact = second_response.json()
    assert second_fact["id"] == first_fact["id"]

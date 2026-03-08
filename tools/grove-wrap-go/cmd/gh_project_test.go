package cmd

import (
	"encoding/json"
	"testing"
)

func TestExtractProjectDataUser(t *testing.T) {
	raw := `{"data":{"user":{"projectsV2":{"nodes":[{"number":1,"title":"Board","closed":false}]}}}}`
	result, err := extractProjectData(raw, "projectsV2")
	if err != nil {
		t.Fatalf("extractProjectData failed: %v", err)
	}
	data, ok := result.(map[string]interface{})
	if !ok {
		t.Fatal("expected map result")
	}
	nodes, ok := data["nodes"].([]interface{})
	if !ok || len(nodes) != 1 {
		t.Fatal("expected 1 node")
	}
}

func TestExtractProjectDataOrg(t *testing.T) {
	raw := `{"data":{"organization":{"projectsV2":{"nodes":[{"number":2,"title":"Org Board"}]}}}}`
	result, err := extractProjectData(raw, "projectsV2")
	if err != nil {
		t.Fatalf("extractProjectData failed: %v", err)
	}
	data, ok := result.(map[string]interface{})
	if !ok {
		t.Fatal("expected map result")
	}
	nodes := data["nodes"].([]interface{})
	if len(nodes) != 1 {
		t.Fatal("expected 1 node")
	}
}

func TestExtractProjectDataMissing(t *testing.T) {
	raw := `{"data":{"user":{}}}`
	_, err := extractProjectData(raw, "projectV2")
	if err == nil {
		t.Error("expected error for missing field")
	}
}

func TestExtractProjectDataInvalidJSON(t *testing.T) {
	_, err := extractProjectData("not json", "projectV2")
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestCountItemsByStatus(t *testing.T) {
	project := map[string]interface{}{
		"items": map[string]interface{}{
			"nodes": []interface{}{
				map[string]interface{}{
					"fieldValues": map[string]interface{}{
						"nodes": []interface{}{
							map[string]interface{}{
								"name": "In Progress",
								"field": map[string]interface{}{
									"name": "Status",
								},
							},
						},
					},
				},
				map[string]interface{}{
					"fieldValues": map[string]interface{}{
						"nodes": []interface{}{
							map[string]interface{}{
								"name": "In Progress",
								"field": map[string]interface{}{
									"name": "Status",
								},
							},
						},
					},
				},
				map[string]interface{}{
					"fieldValues": map[string]interface{}{
						"nodes": []interface{}{
							map[string]interface{}{
								"name": "Done",
								"field": map[string]interface{}{
									"name": "Status",
								},
							},
						},
					},
				},
			},
		},
	}

	counts := countItemsByStatus(project)
	if len(counts) != 2 {
		t.Fatalf("expected 2 status groups, got %d", len(counts))
	}

	found := make(map[string]int)
	for _, sc := range counts {
		found[sc.name] = sc.count
	}
	if found["In Progress"] != 2 {
		t.Errorf("In Progress count = %d, want 2", found["In Progress"])
	}
	if found["Done"] != 1 {
		t.Errorf("Done count = %d, want 1", found["Done"])
	}
}

func TestBatchMoveItemValidation(t *testing.T) {
	// Valid batch
	validJSON := `[{"issue": 123, "status": "In Progress"}, {"issue": 456, "status": "Done"}]`
	var items []batchMoveItem
	err := json.Unmarshal([]byte(validJSON), &items)
	if err != nil {
		t.Fatalf("valid JSON should parse: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].Issue != 123 || items[0].Status != "In Progress" {
		t.Errorf("item[0] = %+v, want {123, 'In Progress'}", items[0])
	}

	// Invalid: missing issue
	invalidJSON := `[{"status": "Done"}]`
	var badItems []batchMoveItem
	json.Unmarshal([]byte(invalidJSON), &badItems)
	if len(badItems) == 1 && badItems[0].Issue != 0 {
		t.Error("expected issue to be 0 for missing field")
	}

	// Invalid JSON
	err = json.Unmarshal([]byte("not json"), &items)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestExtractStatusField(t *testing.T) {
	item := map[string]interface{}{
		"fieldValues": map[string]interface{}{
			"nodes": []interface{}{
				map[string]interface{}{
					"name": "Ready",
					"field": map[string]interface{}{
						"name": "Status",
					},
				},
			},
		},
	}
	got := extractStatusField(item)
	if got != "Ready" {
		t.Errorf("extractStatusField = %q, want %q", got, "Ready")
	}
}

func TestExtractStatusFieldEmpty(t *testing.T) {
	item := map[string]interface{}{}
	got := extractStatusField(item)
	if got != "" {
		t.Errorf("extractStatusField = %q, want empty", got)
	}
}

func TestExtractFieldNames(t *testing.T) {
	project := map[string]interface{}{
		"fields": map[string]interface{}{
			"nodes": []interface{}{
				map[string]interface{}{"name": "Title"},
				map[string]interface{}{"name": "Status"},
				map[string]interface{}{"name": "Priority"},
			},
		},
	}
	names := extractFieldNames(project)
	if len(names) != 3 {
		t.Fatalf("expected 3 fields, got %d", len(names))
	}
	if names[0] != "Title" || names[1] != "Status" || names[2] != "Priority" {
		t.Errorf("fields = %v, want [Title Status Priority]", names)
	}
}

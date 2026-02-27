package lattice

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

// newTestServer creates a test HTTP server that simulates Lattice API endpoints.
func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()

	mux := http.NewServeMux()

	// GET /api/test-tenant/posts
	mux.HandleFunc("/api/test-tenant/posts", func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-token" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		switch r.Method {
		case "GET":
			posts := []Post{
				{ID: "1", Slug: "hello-world", Title: "Hello World", Status: "published", CreatedAt: "2026-01-01", UpdatedAt: "2026-01-15"},
				{ID: "2", Slug: "draft-post", Title: "Draft Post", Status: "draft", CreatedAt: "2026-01-10", UpdatedAt: "2026-01-20"},
			}

			// Filter by status query param
			status := r.URL.Query().Get("status")
			if status != "" && status != "all" {
				filtered := make([]Post, 0)
				for _, p := range posts {
					if p.Status == status {
						filtered = append(filtered, p)
					}
				}
				posts = filtered
			}
			json.NewEncoder(w).Encode(posts)

		case "POST":
			var data CreatePostData
			if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}
			post := Post{
				ID:        "3",
				Slug:      "new-post",
				Title:     data.Title,
				Content:   data.Content,
				Status:    data.Status,
				Tags:      data.Tags,
				CreatedAt: "2026-02-01",
				UpdatedAt: "2026-02-01",
			}
			if post.Status == "" {
				post.Status = "draft"
			}
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(post)

		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// /api/test-tenant/posts/{slug}
	mux.HandleFunc("/api/test-tenant/posts/hello-world", func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-token" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		switch r.Method {
		case "GET":
			json.NewEncoder(w).Encode(Post{
				ID:      "1",
				Slug:    "hello-world",
				Title:   "Hello World",
				Content: "# Hello\n\nThis is a test post.",
				Status:  "published",
				Author:  &Author{ID: "u1", Name: "Autumn"},
				Tags:    []string{"welcome", "test"},
			})
		case "PUT":
			var data UpdatePostData
			json.NewDecoder(r.Body).Decode(&data)
			json.NewEncoder(w).Encode(Post{
				ID:    "1",
				Slug:  "hello-world",
				Title: data.Title,
			})
		case "DELETE":
			w.WriteHeader(http.StatusNoContent)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/test-tenant/posts/not-found", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"post not found"}`, http.StatusNotFound)
	})

	// GET /api/test-tenant/drafts
	mux.HandleFunc("/api/test-tenant/drafts", func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-token" {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		json.NewEncoder(w).Encode([]Post{
			{ID: "2", Slug: "draft-post", Title: "Draft Post", Status: "draft"},
		})
	})

	return httptest.NewServer(mux)
}

func TestListPosts(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient("test-token", "test-tenant", srv.URL)

	posts, err := client.ListPosts(ListOptions{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(posts) != 2 {
		t.Fatalf("expected 2 posts, got %d", len(posts))
	}
	if posts[0].Slug != "hello-world" {
		t.Errorf("expected first post slug 'hello-world', got %q", posts[0].Slug)
	}
}

func TestListPostsFiltered(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient("test-token", "test-tenant", srv.URL)

	posts, err := client.ListPosts(ListOptions{Status: "published"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(posts) != 1 {
		t.Fatalf("expected 1 published post, got %d", len(posts))
	}
	if posts[0].Status != "published" {
		t.Errorf("expected status 'published', got %q", posts[0].Status)
	}
}

func TestGetPost(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient("test-token", "test-tenant", srv.URL)

	post, err := client.GetPost("hello-world")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.Title != "Hello World" {
		t.Errorf("expected title 'Hello World', got %q", post.Title)
	}
	if post.Author == nil || post.Author.Name != "Autumn" {
		t.Errorf("expected author 'Autumn', got %+v", post.Author)
	}
	if len(post.Tags) != 2 {
		t.Errorf("expected 2 tags, got %d", len(post.Tags))
	}
}

func TestGetPostNotFound(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient("test-token", "test-tenant", srv.URL)

	_, err := client.GetPost("not-found")
	if err == nil {
		t.Fatal("expected error for non-existent post")
	}
}

func TestCreatePost(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient("test-token", "test-tenant", srv.URL)

	post, err := client.CreatePost(CreatePostData{
		Title:   "New Post",
		Content: "Some content",
		Status:  "draft",
		Tags:    []string{"new"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.Title != "New Post" {
		t.Errorf("expected title 'New Post', got %q", post.Title)
	}
}

func TestUpdatePost(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient("test-token", "test-tenant", srv.URL)

	post, err := client.UpdatePost("hello-world", UpdatePostData{
		Title: "Updated Title",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.Title != "Updated Title" {
		t.Errorf("expected title 'Updated Title', got %q", post.Title)
	}
}

func TestDeletePost(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient("test-token", "test-tenant", srv.URL)

	err := client.DeletePost("hello-world")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestListDrafts(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient("test-token", "test-tenant", srv.URL)

	posts, err := client.ListDrafts()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(posts) != 1 {
		t.Fatalf("expected 1 draft, got %d", len(posts))
	}
	if posts[0].Status != "draft" {
		t.Errorf("expected status 'draft', got %q", posts[0].Status)
	}
}

func TestUnauthorized(t *testing.T) {
	srv := newTestServer(t)
	defer srv.Close()

	client := NewClient("bad-token", "test-tenant", srv.URL)

	_, err := client.ListPosts(ListOptions{})
	if err == nil {
		t.Fatal("expected error for unauthorized request")
	}
}

func TestRequestContentType(t *testing.T) {
	var receivedContentType string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedContentType = r.Header.Get("Content-Type")
		body, _ := io.ReadAll(r.Body)
		if len(body) > 0 {
			// Verify it's valid JSON
			var v interface{}
			if err := json.Unmarshal(body, &v); err != nil {
				t.Errorf("request body is not valid JSON: %s", body)
			}
		}
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(Post{ID: "1"})
	}))
	defer srv.Close()

	client := NewClient("token", "tenant", srv.URL)
	client.CreatePost(CreatePostData{Title: "Test"})

	if receivedContentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", receivedContentType)
	}
}

func TestServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
	}))
	defer srv.Close()

	client := NewClient("token", "tenant", srv.URL)

	_, err := client.ListPosts(ListOptions{})
	if err == nil {
		t.Fatal("expected error for 500 response")
	}
}

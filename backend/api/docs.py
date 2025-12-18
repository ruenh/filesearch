"""API Documentation blueprint with OpenAPI/Swagger spec."""
from flask import Blueprint, jsonify

docs_bp = Blueprint('docs', __name__)

# OpenAPI 3.0 Specification
OPENAPI_SPEC = {
    "openapi": "3.0.3",
    "info": {
        "title": "File Search RAG API",
        "description": """
# File Search RAG API

A comprehensive REST API for intelligent document management and semantic search using Gemini AI.

## Authentication

The API supports two authentication methods:

### API Key Authentication
Include your API key in the request header:
```
X-API-Key: your_api_key_here
```
Or use the Authorization header:
```
Authorization: ApiKey your_api_key_here
```

### JWT Token Authentication
For web application users, use JWT tokens:
```
Authorization: Bearer your_jwt_token_here
```

## Rate Limiting

API key requests are rate-limited. Check response headers for rate limit info:
- `X-RateLimit-Limit`: Maximum requests per hour
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets

## Error Responses

All errors follow this format:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
        """,
        "version": "1.0.0",
        "contact": {
            "name": "API Support",
            "email": "support@filesearchrag.com"
        },
        "license": {
            "name": "MIT",
            "url": "https://opensource.org/licenses/MIT"
        }
    },
    "servers": [
        {
            "url": "/api",
            "description": "API Server"
        }
    ],
    "tags": [
        {"name": "Authentication", "description": "User authentication and registration"},
        {"name": "Storage", "description": "Document storage management"},
        {"name": "Documents", "description": "Document upload, retrieval, and management"},
        {"name": "Search", "description": "Semantic search and search history"},
        {"name": "AI", "description": "AI-powered features (chat, summarization, translation)"},
        {"name": "Folders", "description": "Folder organization"},
        {"name": "Tags", "description": "Document tagging"},
        {"name": "Comments", "description": "Document comments"},
        {"name": "Share", "description": "Document sharing"},
        {"name": "API Keys", "description": "API key management"},
        {"name": "Analytics", "description": "Usage analytics and reports"},
        {"name": "Users", "description": "User management (admin)"}
    ],
    "components": {
        "securitySchemes": {
            "ApiKeyAuth": {
                "type": "apiKey",
                "in": "header",
                "name": "X-API-Key",
                "description": "API key for external integrations"
            },
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "JWT token for web application users"
            }
        },
        "schemas": {
            "Error": {
                "type": "object",
                "properties": {
                    "error": {"type": "string", "description": "Error type"},
                    "message": {"type": "string", "description": "Detailed error message"}
                },
                "required": ["error", "message"]
            },
            "Storage": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid"},
                    "name": {"type": "string"},
                    "document_count": {"type": "integer"},
                    "total_size": {"type": "integer"},
                    "created_at": {"type": "string", "format": "date-time"},
                    "updated_at": {"type": "string", "format": "date-time"}
                }
            },
            "Document": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid"},
                    "storage_id": {"type": "string", "format": "uuid"},
                    "folder_id": {"type": "string", "format": "uuid", "nullable": True},
                    "name": {"type": "string"},
                    "file_type": {"type": "string"},
                    "size": {"type": "integer"},
                    "is_favorite": {"type": "boolean"},
                    "is_archived": {"type": "boolean"},
                    "tags": {"type": "array", "items": {"$ref": "#/components/schemas/Tag"}},
                    "created_at": {"type": "string", "format": "date-time"},
                    "updated_at": {"type": "string", "format": "date-time"}
                }
            },
            "Tag": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid"},
                    "name": {"type": "string"},
                    "color": {"type": "string"},
                    "is_auto_generated": {"type": "boolean"}
                }
            },
            "SearchResult": {
                "type": "object",
                "properties": {
                    "document_id": {"type": "string", "format": "uuid"},
                    "document_name": {"type": "string"},
                    "snippet": {"type": "string"},
                    "score": {"type": "number"},
                    "highlights": {"type": "array", "items": {"type": "string"}}
                }
            },
            "ChatMessage": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid"},
                    "role": {"type": "string", "enum": ["user", "assistant"]},
                    "content": {"type": "string"},
                    "sources": {"type": "array", "items": {"type": "object"}},
                    "timestamp": {"type": "string", "format": "date-time"}
                }
            },
            "APIKey": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid"},
                    "name": {"type": "string"},
                    "key_prefix": {"type": "string"},
                    "is_active": {"type": "boolean"},
                    "rate_limit": {"type": "integer"},
                    "request_count": {"type": "integer"},
                    "last_used_at": {"type": "string", "format": "date-time", "nullable": True},
                    "expires_at": {"type": "string", "format": "date-time", "nullable": True},
                    "created_at": {"type": "string", "format": "date-time"}
                }
            },
            "User": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid"},
                    "email": {"type": "string", "format": "email"},
                    "name": {"type": "string"},
                    "role": {"type": "string", "enum": ["admin", "editor", "viewer"]},
                    "two_factor_enabled": {"type": "boolean"},
                    "created_at": {"type": "string", "format": "date-time"}
                }
            }
        }
    },
    "paths": {}
}

# Define API paths
PATHS = {
    # Authentication
    "/auth/register": {
        "post": {
            "tags": ["Authentication"],
            "summary": "Register a new user",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["email", "password", "name"],
                            "properties": {
                                "email": {"type": "string", "format": "email"},
                                "password": {"type": "string", "minLength": 8},
                                "name": {"type": "string"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "201": {"description": "User registered successfully"},
                "400": {"description": "Invalid input"},
                "409": {"description": "Email already registered"}
            }
        }
    },
    "/auth/login": {
        "post": {
            "tags": ["Authentication"],
            "summary": "Login user",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["email", "password"],
                            "properties": {
                                "email": {"type": "string", "format": "email"},
                                "password": {"type": "string"},
                                "totp_code": {"type": "string", "description": "2FA code if enabled"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {"description": "Login successful"},
                "401": {"description": "Invalid credentials"}
            }
        }
    },
    # Storage
    "/storage": {
        "get": {
            "tags": ["Storage"],
            "summary": "List all storages",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "responses": {
                "200": {
                    "description": "List of storages",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "storages": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/Storage"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "post": {
            "tags": ["Storage"],
            "summary": "Create a new storage",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["name"],
                            "properties": {
                                "name": {"type": "string", "maxLength": 255}
                            }
                        }
                    }
                }
            },
            "responses": {
                "201": {"description": "Storage created"},
                "400": {"description": "Invalid input"}
            }
        }
    },
    "/storage/{id}": {
        "get": {
            "tags": ["Storage"],
            "summary": "Get storage details",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {"description": "Storage details"},
                "404": {"description": "Storage not found"}
            }
        },
        "delete": {
            "tags": ["Storage"],
            "summary": "Delete a storage",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {"description": "Storage deleted"},
                "404": {"description": "Storage not found"}
            }
        }
    },
    # Documents
    "/documents": {
        "get": {
            "tags": ["Documents"],
            "summary": "List documents",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "parameters": [
                {"name": "storage_id", "in": "query", "schema": {"type": "string"}},
                {"name": "folder_id", "in": "query", "schema": {"type": "string"}},
                {"name": "favorite", "in": "query", "schema": {"type": "boolean"}},
                {"name": "archived", "in": "query", "schema": {"type": "boolean"}},
                {"name": "tag", "in": "query", "schema": {"type": "string"}},
                {"name": "sort_by", "in": "query", "schema": {"type": "string", "enum": ["name", "date", "size"]}},
                {"name": "order", "in": "query", "schema": {"type": "string", "enum": ["asc", "desc"]}},
                {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 20}},
                {"name": "offset", "in": "query", "schema": {"type": "integer", "default": 0}}
            ],
            "responses": {
                "200": {"description": "List of documents"}
            }
        },
        "post": {
            "tags": ["Documents"],
            "summary": "Upload a document",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "multipart/form-data": {
                        "schema": {
                            "type": "object",
                            "required": ["file", "storage_id"],
                            "properties": {
                                "file": {"type": "string", "format": "binary"},
                                "storage_id": {"type": "string"},
                                "folder_id": {"type": "string"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "201": {"description": "Document uploaded"},
                "400": {"description": "Invalid file"}
            }
        }
    },
    "/documents/{id}": {
        "get": {
            "tags": ["Documents"],
            "summary": "Get document details",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {"description": "Document details"},
                "404": {"description": "Document not found"}
            }
        },
        "put": {
            "tags": ["Documents"],
            "summary": "Update document",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {"description": "Document updated"},
                "404": {"description": "Document not found"}
            }
        },
        "delete": {
            "tags": ["Documents"],
            "summary": "Delete document (move to trash)",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {"description": "Document moved to trash"},
                "404": {"description": "Document not found"}
            }
        }
    },
    # Search
    "/search": {
        "post": {
            "tags": ["Search"],
            "summary": "Semantic search across documents",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["query", "storage_id"],
                            "properties": {
                                "query": {"type": "string"},
                                "storage_id": {"type": "string"},
                                "filters": {
                                    "type": "object",
                                    "properties": {
                                        "file_type": {"type": "array", "items": {"type": "string"}},
                                        "date_from": {"type": "string", "format": "date"},
                                        "date_to": {"type": "string", "format": "date"},
                                        "size_min": {"type": "integer"},
                                        "size_max": {"type": "integer"}
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "Search results",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "results": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/SearchResult"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    # AI Features
    "/ai/chat": {
        "post": {
            "tags": ["AI"],
            "summary": "Chat with documents (RAG)",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["message", "storage_id"],
                            "properties": {
                                "message": {"type": "string"},
                                "storage_id": {"type": "string"},
                                "session_id": {"type": "string", "description": "For multi-turn conversations"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "AI response with sources",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/ChatMessage"}
                        }
                    }
                }
            }
        }
    },
    "/ai/summarize": {
        "post": {
            "tags": ["AI"],
            "summary": "Summarize a document",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["document_id"],
                            "properties": {
                                "document_id": {"type": "string"},
                                "length": {"type": "string", "enum": ["short", "medium", "long"], "default": "medium"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {"description": "Document summary"}
            }
        }
    },
    "/ai/translate": {
        "post": {
            "tags": ["AI"],
            "summary": "Translate a document",
            "security": [{"ApiKeyAuth": []}, {"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["document_id", "target_language"],
                            "properties": {
                                "document_id": {"type": "string"},
                                "target_language": {"type": "string", "example": "en"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {"description": "Translated content"}
            }
        }
    },
    # API Keys
    "/api-keys": {
        "get": {
            "tags": ["API Keys"],
            "summary": "List your API keys",
            "security": [{"BearerAuth": []}],
            "responses": {
                "200": {
                    "description": "List of API keys",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "api_keys": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/APIKey"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "post": {
            "tags": ["API Keys"],
            "summary": "Create a new API key",
            "security": [{"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["name"],
                            "properties": {
                                "name": {"type": "string", "maxLength": 255},
                                "rate_limit": {"type": "integer", "default": 1000},
                                "expires_at": {"type": "string", "format": "date-time"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "201": {
                    "description": "API key created (key shown only once!)",
                    "content": {
                        "application/json": {
                            "schema": {
                                "allOf": [
                                    {"$ref": "#/components/schemas/APIKey"},
                                    {
                                        "type": "object",
                                        "properties": {
                                            "key": {"type": "string", "description": "The API key (only shown once!)"},
                                            "warning": {"type": "string"}
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        }
    },
    "/api-keys/{id}": {
        "get": {
            "tags": ["API Keys"],
            "summary": "Get API key details",
            "security": [{"BearerAuth": []}],
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {"description": "API key details"},
                "404": {"description": "API key not found"}
            }
        },
        "put": {
            "tags": ["API Keys"],
            "summary": "Update API key",
            "security": [{"BearerAuth": []}],
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "requestBody": {
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "rate_limit": {"type": "integer"},
                                "is_active": {"type": "boolean"},
                                "expires_at": {"type": "string", "format": "date-time"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {"description": "API key updated"},
                "404": {"description": "API key not found"}
            }
        },
        "delete": {
            "tags": ["API Keys"],
            "summary": "Delete API key",
            "security": [{"BearerAuth": []}],
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {"description": "API key deleted"},
                "404": {"description": "API key not found"}
            }
        }
    },
    "/api-keys/{id}/regenerate": {
        "post": {
            "tags": ["API Keys"],
            "summary": "Regenerate API key",
            "security": [{"BearerAuth": []}],
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}
            ],
            "responses": {
                "200": {"description": "New API key generated (shown only once!)"},
                "404": {"description": "API key not found"}
            }
        }
    },
    "/api-keys/{id}/usage": {
        "get": {
            "tags": ["API Keys"],
            "summary": "Get API key usage statistics",
            "security": [{"BearerAuth": []}],
            "parameters": [
                {"name": "id", "in": "path", "required": True, "schema": {"type": "string"}},
                {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 100}},
                {"name": "offset", "in": "query", "schema": {"type": "integer", "default": 0}}
            ],
            "responses": {
                "200": {"description": "Usage statistics and logs"},
                "404": {"description": "API key not found"}
            }
        }
    }
}

# Merge paths into spec
OPENAPI_SPEC["paths"] = PATHS


@docs_bp.route('/openapi.json')
def get_openapi_spec():
    """Return the OpenAPI specification as JSON."""
    return jsonify(OPENAPI_SPEC)


@docs_bp.route('')
@docs_bp.route('/')
def swagger_ui():
    """Serve Swagger UI for interactive API documentation."""
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Search RAG API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
    <style>
        body { margin: 0; padding: 0; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .info .title { font-size: 2em; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: "/api/docs/openapi.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
                persistAuthorization: true,
                tryItOutEnabled: true
            });
        };
    </script>
</body>
</html>
    """


@docs_bp.route('/redoc')
def redoc():
    """Serve ReDoc for alternative API documentation view."""
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Search RAG API Documentation - ReDoc</title>
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; }
    </style>
</head>
<body>
    <redoc spec-url="/api/docs/openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
    """

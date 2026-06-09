import csv
import os
from dotenv import load_dotenv
from notion_client import Client

# Load environment variables
load_dotenv()
# Initialize Notion client
notion = Client(auth=os.getenv("NOTION_TOKEN"))


def get_private_vault_id():
    """Return the page ID for the 'Private Vault' page; create it if necessary."""
    # Search for an existing page titled 'Private Vault'
    response = notion.search(
        filter={"property": "object", "value": "page"},
        query="Private Vault"
    )
    for page in response.get("results", []):
        properties = page.get("properties", {})
        for prop in properties.values():
            if prop.get("type") == "title":
                title = "".join(
                    [t.get("plain_text", "") for t in prop.get("title", [])]
                ).strip()
                if title == "Private Vault":
                    return page["id"]

    # If not found, create a new page at the workspace root
    new_page = notion.pages.create(
        parent={"type": "workspace", "workspace": True},
        properties={
            "title": [
                {"type": "text", "text": {"content": "Private Vault"}}
            ]
        }
    )
    return new_page["id"]


def move_pages_to_vault(csv_file: str) -> None:
    """Move pages marked as account/sensitive info into the Private Vault."""
    vault_id = get_private_vault_id()

    # Read recommendations CSV to find pages to move
    with open(csv_file, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Only consider page objects
            if row.get("type") != "page":
                continue
            action = row.get("recommended_action")
            if action in ("계정정보_DB화", "민감정보_분리"):
                page_id = row["id"]
                title = row.get("title", "Untitled")
                try:
                    notion.pages.update(
                        page_id=page_id,
                        parent={"type": "page_id", "page_id": vault_id}
                    )
                    print(f"Moved {title} ({page_id}) to Private Vault")
                except Exception as e:
                    print(f"Failed to move {title} ({page_id}): {e}")


if __name__ == "__main__":
    # CSV file with recommended actions; ensure it's in the same directory when running
    move_pages_to_vault("notion_cleanup_recommendations.csv")

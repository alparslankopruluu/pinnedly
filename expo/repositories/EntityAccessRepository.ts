import { COLLECTIONS, doc, getDb, getDoc, updateDoc } from '@/lib/firestore';
import { SharePermission } from '@/types';

const ENTITY_COLLECTIONS: Record<string, string> = {
  note: COLLECTIONS.notes,
  bookmark: COLLECTIONS.bookmarks,
  project: COLLECTIONS.projects,
  list: COLLECTIONS.bookmarkLists,
};

class EntityAccessRepository {
  getCollection(entityType: string): string {
    const collection = ENTITY_COLLECTIONS[entityType];
    if (!collection) throw new Error(`Unsupported entity type: ${entityType}`);
    return collection;
  }

  async grantAccess(
    entityType: string,
    entityId: string,
    userId: string,
    permission: SharePermission
  ): Promise<void> {
    const collection = this.getCollection(entityType);
    const ref = doc(getDb(), collection, entityId);
    const entityDoc = await getDoc(ref);
    if (!entityDoc.exists()) throw new Error('Entity not found');

    const data = entityDoc.data();
    const sharedWith: string[] = Array.from(new Set([...(data.sharedWith ?? []), userId]));
    const editors: string[] = [...(data.editors ?? [])];

    if (permission === 'edit' && !editors.includes(userId)) {
      editors.push(userId);
    } else if (permission === 'view') {
      const editorIndex = editors.indexOf(userId);
      if (editorIndex >= 0) editors.splice(editorIndex, 1);
    }

    const updates: Record<string, unknown> = {
      sharedWith,
      editors,
    };

    if (entityType === 'list') {
      if (data.visibility !== 'public' && !data.isPublic) {
        updates.visibility = 'shared';
      }
    } else if (data.visibility !== 'public') {
      updates.visibility = 'shared';
    }

    await updateDoc(ref, updates);
  }

  async revokeAccess(entityType: string, entityId: string, userId: string): Promise<void> {
    const collection = this.getCollection(entityType);
    const ref = doc(getDb(), collection, entityId);
    const entityDoc = await getDoc(ref);
    if (!entityDoc.exists()) return;

    const data = entityDoc.data();
    const sharedWith = (data.sharedWith ?? []).filter((id: string) => id !== userId);
    const editors = (data.editors ?? []).filter((id: string) => id !== userId);

    const updates: Record<string, unknown> = { sharedWith, editors };

    if (sharedWith.length === 0) {
      if (entityType === 'list') {
        if (!data.isPublic && data.visibility !== 'public') {
          updates.visibility = 'private';
        }
      } else if (data.visibility === 'shared') {
        updates.visibility = 'private';
      }
    }

    await updateDoc(ref, updates);
  }

  async updateAccessPermission(
    entityType: string,
    entityId: string,
    userId: string,
    permission: SharePermission
  ): Promise<void> {
    await this.grantAccess(entityType, entityId, userId, permission);
  }
}

export const entityAccessRepository = new EntityAccessRepository();

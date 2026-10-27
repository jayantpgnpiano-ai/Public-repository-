import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractHashtags,
  formatTimeAgo,
  sortPostsNewestFirst,
  validatePostContent,
  isUserFollowed,
  filterContentByQuery,
  PostItem,
} from './social';

test('extractHashtags correctly parses multiple tags and deduplicates', () => {
  const text = 'Exploring #minimalism and #Design with a quiet mind. #design again!';
  const tags = extractHashtags(text);
  assert.deepEqual(tags, ['minimalism', 'design']);
});

test('extractHashtags handles text without tags gracefully', () => {
  assert.deepEqual(extractHashtags('Just a calm thought without tags.'), []);
  assert.deepEqual(extractHashtags(''), []);
});

test('formatTimeAgo returns accurate human-readable intervals', () => {
  const base = 1700000000000;
  const justNow = new Date(base - 15 * 1000).toISOString();
  const fiveMinAgo = new Date(base - 5 * 60 * 1000).toISOString();
  const threeHoursAgo = new Date(base - 3 * 3600 * 1000).toISOString();
  const twoDaysAgo = new Date(base - 2 * 86400 * 1000).toISOString();

  assert.equal(formatTimeAgo(justNow, base), 'just now');
  assert.equal(formatTimeAgo(fiveMinAgo, base), '5m');
  assert.equal(formatTimeAgo(threeHoursAgo, base), '3h');
  assert.equal(formatTimeAgo(twoDaysAgo, base), '2d');
});

test('sortPostsNewestFirst correctly places most recent posts first', () => {
  const posts: PostItem[] = [
    { id: '1', authorId: 'u1', content: 'Old', createdAt: '2026-01-01T10:00:00Z', likesCount: 0, commentsCount: 0 },
    { id: '2', authorId: 'u2', content: 'Newest', createdAt: '2026-01-03T10:00:00Z', likesCount: 0, commentsCount: 0 },
    { id: '3', authorId: 'u3', content: 'Middle', createdAt: '2026-01-02T10:00:00Z', likesCount: 0, commentsCount: 0 },
  ];

  const sorted = sortPostsNewestFirst(posts);
  assert.equal(sorted[0].id, '2');
  assert.equal(sorted[1].id, '3');
  assert.equal(sorted[2].id, '1');
});

test('validatePostContent catches empty text and excessive length', () => {
  assert.equal(validatePostContent('   ').isValid, false);
  assert.equal(validatePostContent('A thoughtful note').isValid, true);
  const oversized = 'a'.repeat(2001);
  assert.equal(validatePostContent(oversized).isValid, false);
});

test('isUserFollowed checks array membership accurately', () => {
  assert.equal(isUserFollowed(['u1', 'u2'], 'u2'), true);
  assert.equal(isUserFollowed(['u1', 'u2'], 'u3'), false);
});

test('filterContentByQuery filters by designated string and array fields', () => {
  const users = [
    { username: 'elena', displayName: 'Elena Vance', bio: 'Editorial designer' },
    { username: 'marcus', displayName: 'Marcus Thorne', bio: 'Architecture and coffee' },
  ];

  const matches = filterContentByQuery(users, 'thorne', ['username', 'displayName']);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].username, 'marcus');
});

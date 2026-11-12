const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DrawerSwipe } = require(process.env.DRAWER_SWIPE_MODULE || '../src/app/shared/components/navbar/drawer-swipe.ts');
const swipe = (open = false, width = 320) => new DrawerSwipe(7, 50, 200, open, width, 0);

test('the menu follows the finger before release and clamps both edges', () => {
  const drag = swipe();
  assert.equal(drag.move(90, 202, 20), -280);
  assert.equal(drag.move(500, 205, 40), 0);
  assert.equal(drag.move(-500, 205, 60), -320);
});
test('vertical scrolling stays vertical even if the finger later turns right', () => {
  const drag = swipe();
  assert.equal(drag.move(53, 220, 20), null);
  assert.equal(drag.move(200, 225, 40), null);
  assert.equal(drag.finish(40), false);
});
test('a slow short drag snaps back while a fast deliberate flick opens', () => {
  const slow = swipe();
  slow.move(90, 202, 200);
  assert.equal(slow.finish(300), false);
  const fast = swipe();
  fast.move(82, 202, 35);
  assert.equal(fast.finish(40), true);
});
test('a held finger cannot keep stale momentum', () => {
  const drag = swipe();
  drag.move(82, 202, 25);
  assert.equal(drag.finish(250), false);
});
test('distance opens a slow drag and closes an open menu', () => {
  const opening = swipe();
  opening.move(145, 230, 300);
  assert.equal(opening.finish(450), true);
  const closing = swipe(true);
  assert.equal(closing.move(-45, 205, 300), -95);
  assert.equal(closing.finish(450), false);
});
test('a closing drag can reverse before release', () => {
  const drag = swipe(true);
  drag.move(-100, 202, 300);
  drag.move(-70, 202, 330);
  assert.equal(drag.finish(340), true);
});
test('jitter and a gesture in the wrong direction do not open the menu', () => {
  const jitter = swipe();
  assert.equal(jitter.move(54, 202, 20), null);
  assert.equal(jitter.finish(30), false);
  const wrong = swipe();
  wrong.move(30, 201, 20);
  assert.equal(wrong.move(200, 201, 40), null);
});
test('opening zone protects the browser back edge and desktop navigation', () => {
  for (const width of [320, 375, 430, 768]) {
    assert.equal(DrawerSwipe.canStart(23, width, false), false);
    assert.equal(DrawerSwipe.canStart(60, width, false), true);
    assert.equal(DrawerSwipe.canStart(180, width, false), false);
    assert.equal(DrawerSwipe.canStart(width - 5, width, true), true);
  }
  assert.equal(DrawerSwipe.canStart(60, 1280, false), false);
});

test('a small diagonal wobble does not prematurely discard a horizontal swipe', () => {
  const drag = swipe();
  assert.equal(drag.move(59, 211, 15), null);
  assert.equal(drag.move(86, 213, 35), -284);
  assert.equal(drag.finish(40), true);
});
test('a clear vertical pan stays with the page even after a horizontal turn', () => {
  const drag = swipe();
  assert.equal(drag.move(59, 223, 20), null);
  assert.equal(drag.move(150, 230, 40), null);
  assert.equal(drag.finish(50), false);
});
test('the visible menu button also serves as a reliable swipe handle', () => {
  assert.equal(DrawerSwipe.canStart(18, 375, false), false);
  assert.equal(DrawerSwipe.canStart(18, 375, false, true), true);
  assert.equal(DrawerSwipe.canStart(85, 375, false), true);
  assert.equal(DrawerSwipe.canStart(125, 375, false), true);
  assert.equal(DrawerSwipe.canStart(140, 375, false), true);
  assert.equal(DrawerSwipe.canStart(350, 375, false), true);
  assert.equal(DrawerSwipe.canStart(18, 1280, false, true), false);
});
test('short intentional drags settle at a reachable distance', () => {
  const drag = swipe();
  drag.move(125, 201, 200);
  assert.equal(drag.finish(300), true);
});

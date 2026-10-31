import test from 'node:test';
import assert from 'node:assert/strict';
import {StableReviewOrder} from '../review-order.mjs';

const posts=(...ids)=>ids.map(post_id=>({post_id}));

test('review list is randomized once and stays fixed while rerendering',()=>{
 const order=new StableReviewOrder(()=>0),input=posts('a','b','c','d');
 const first=order.reconcile(input).map(p=>p.post_id);
 assert.notDeepEqual(first,input.map(p=>p.post_id));
 assert.deepEqual(order.reconcile(input).map(p=>p.post_id),first);
});

test('refresh keeps existing positions and randomizes only new posts',()=>{
 const order=new StableReviewOrder(()=>0);
 const first=order.reconcile(posts('a','b','c')).map(p=>p.post_id);
 const refreshed=order.reconcile(posts('a','b','c','d','e')).map(p=>p.post_id);
 assert.deepEqual(refreshed.slice(0,first.length),first);
 assert.deepEqual(new Set(refreshed),new Set(['a','b','c','d','e']));
 assert.deepEqual(order.reconcile(posts('a','b','c','d','e')).map(p=>p.post_id),refreshed);
});

test('removed posts disappear without reordering survivors',()=>{
 const order=new StableReviewOrder(()=>0);
 const first=order.reconcile(posts('a','b','c','d')).map(p=>p.post_id);
 assert.deepEqual(order.reconcile(posts('a','c','d')).map(p=>p.post_id),first.filter(id=>id!=='b'));
});

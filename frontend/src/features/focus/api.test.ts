import { remaining, timeLabel, FocusSession } from './api';
const session:FocusSession={id:'s1',task:null,task_title:'',phase:'work',status:'running',goal:'',result:'',planned_seconds:1500,elapsed_seconds:0,ends_at:'2026-10-03T10:25:00Z',started_at:'2026-10-03T10:00:00Z'};
test('restores remaining time from server deadline, correcting device clock skew',()=>{
 expect(remaining(session,120000,Date.parse('2026-10-03T10:08:00Z'))).toBe(900);
});
test('pause freezes accumulated work regardless of device time',()=>{
 expect(remaining({...session,status:'paused',ends_at:null,elapsed_seconds:200},0,Date.now())).toBe(1300);
});
test('expired sessions stay at zero',()=>{
 expect(remaining(session,0,Date.parse('2026-10-04T10:00:00Z'))).toBe(0);
});
test('durations over an hour remain readable',()=>{expect(timeLabel(5401)).toBe('90:01')});

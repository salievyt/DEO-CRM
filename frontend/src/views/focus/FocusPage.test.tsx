import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {FocusPage} from './FocusPage';
import {focusApi,FocusSession} from '@/features/focus/api';
import {api} from '@/shared/api/base';
jest.mock('@/shared/api/base',()=>({api:{get:jest.fn()}}));
jest.mock('@/features/focus/api',()=>({...jest.requireActual('@/features/focus/api'),focusApi:{state:jest.fn(),settings:jest.fn(),stats:jest.fn(),notes:jest.fn(),history:jest.fn(),shop:jest.fn(),start:jest.fn(),action:jest.fn(),addNote:jest.fn()}}));
const mock=(fn:unknown)=>fn as jest.Mock;
let active:FocusSession|null=null;
beforeEach(()=>{
 active=null;jest.clearAllMocks();
 mock(focusApi.state).mockImplementation(async()=>({active,last_session:null,server_time:new Date().toISOString()}));
 mock(focusApi.settings).mockResolvedValue({work_minutes:25,short_break_minutes:5,long_break_minutes:15,cycles:4,daily_goal:4,theme:'midnight',sound:'none',pet:'bee',coins:0,inventory:[],timer_style:'digital',auto_advance:false});
 mock(focusApi.stats).mockResolvedValue({today_seconds:0,today_sessions:0,total_seconds:0,total_sessions:0,streak:0,level:1,xp:0,daily_goal:4,daily:[],achievements:[]});
 mock(focusApi.notes).mockResolvedValue({results:[]});mock(focusApi.history).mockResolvedValue({results:[],next:null});mock(focusApi.shop).mockResolvedValue([]);
 mock(api.get).mockResolvedValue({data:{results:[{id:'task1',title:'Макет сайта'}],next:null}});
 mock(focusApi.start).mockImplementation(async(data)=>{active={id:'s1',task:data.task,task_title:'Макет сайта',phase:data.phase,status:'running',goal:data.goal,result:'',planned_seconds:1500,elapsed_seconds:0,ends_at:new Date(Date.now()+1500000).toISOString(),started_at:new Date().toISOString()};return active});
 mock(focusApi.action).mockImplementation(async(_id,action)=>{if(active)active={...active,status:action==='pause'?'paused':'running',elapsed_seconds:10};return active});
});
function mount(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><FocusPage/></QueryClientProvider>)}
test('starts a session tied to the selected CRM task and pauses through backend',async()=>{
 mount();await screen.findByRole('option',{name:'Макет сайта'});
 fireEvent.change(screen.getByLabelText('Задача для фокуса'),{target:{value:'task1'}});
 fireEvent.change(screen.getByLabelText('Цель фокус-сессии'),{target:{value:'Собрать первый экран'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Начать фокус'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Начать фокус'}));
 await waitFor(()=>expect(focusApi.start).toHaveBeenCalledWith({phase:'work',task:'task1',goal:'Собрать первый экран'}));
 const pause=await screen.findByRole('button',{name:'Пауза'});fireEvent.click(pause);
 await waitFor(()=>expect(focusApi.action).toHaveBeenCalledWith('s1','pause'));
 await screen.findByRole('button',{name:'Продолжить'});
});
test('shows a server conflict without pretending the timer has started',async()=>{
 mock(focusApi.start).mockRejectedValue({response:{data:{detail:'У вас уже есть активный таймер.'}}});
 mount();await waitFor(()=>expect(screen.getByRole('button',{name:'Начать фокус'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Начать фокус'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('У вас уже есть активный таймер.');
 expect(screen.queryByRole('button',{name:'Пауза'})).not.toBeInTheDocument();
});

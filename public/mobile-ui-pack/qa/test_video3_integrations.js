const fs=require('fs'),vm=require('vm');
let currentPage='home';
const prefs={permissionMode:'Allow low-risk actions',projects:[],chatHistory:[{role:'assistant',text:'Hello from Nexa'}]};
const classList={add(){},remove(){}};
const ctx={
  console,window:{},navigator:{},prefs,
  pages:{home:()=>'<home/>',projects:()=>'<projects/>',customize:()=>'<div>Plugins 4 added</div>',chat:()=>'<chat/>'},
  pageTitles:{},screen:{addEventListener(){}},modalLayer:{hidden:true,classList,innerHTML:'',addEventListener(){}},
  section:s=>`<h2>${s}</h2>`, save(){}, nav:p=>{currentPage=p;}, render(){},toast(){},
  handleAction(){},clickChoice(){},
  currentPage:()=>currentPage
};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('/mnt/data/ai_mobile_ui_pack/integrations-ui.js','utf8'),ctx);
const assert=(name,ok)=>{console.log((ok?'PASS ':'FAIL ')+name);if(!ok)process.exitCode=1;};
const html=ctx.pages.plugins();
assert('directory renders 58 plugin rows', (html.match(/class="video-plugin-row"/g)||[]).length===58);
assert('directory renders 57 plus buttons', (html.match(/class="video-plugin-add/g)||[]).length===57);
assert('Google Drive lock state appears',html.includes('data-plugin="Google Drive"')&&html.includes('video-plugin-lock'));
assert('popular, new, and all capability groups appear',['Popular','New & noteworthy','Productivity','Communication','Creativity','Developer Tools','Fitness','Finance','Travel','Entertainment','Education','Business &amp; Operations','Data &amp; Analytics','Scientific Research','Security','Other'].every(x=>html.includes(x)));
assert('Plugin Management detail has read/write actions',ctx.pages.videoPluginDetail().includes('get app permissions')&&ctx.pages.videoPluginDetail().includes('Uninstall app'));
assert('skill detail has use-skill switch and action guidance',ctx.pages.pluginManagementSkill().includes('pluginManagementSkillEnabled')&&ctx.pages.pluginManagementSkill().includes('get.plugin.dependencies'));
assert('chat page has response toolbar controls',ctx.pages.chat().includes('video-message-toolbar'));
assert('customize shows real initial installed count',ctx.pages.customize().includes('1 added'));
assert('permissions page shows Plugin Management only initially',ctx.pages.permissions().includes('Plugin Management')&&!ctx.pages.permissions().includes('AppDeploy'));
assert('installed apps page lists Plugin Management',ctx.pages.videoInstalledApps().includes('Plugin Management'));
console.log('Directory inventory',JSON.stringify(ctx.window.NEXA_VIDEO_PLUGIN_DIRECTORY));
ctx.handleAction('toggleVideoPlugin',{dataset:{plugin:'GitHub'}});
assert('plus action adds GitHub without navigation',prefs.videoPluginAdded.includes('GitHub')&&currentPage==='home');
ctx.handleAction('chatOptions',{});
assert('chatOptions opens the nine-item context menu',ctx.modalLayer.innerHTML.includes('videoChatMenuChoice')&&(ctx.modalLayer.innerHTML.match(/videoChatMenuChoice/g)||[]).length===9);
ctx.handleAction('videoChatMenuChoice',{dataset:{menuAction:'pin'}});
assert('Pin menu action toggles pinned state',prefs.chatPinned===true);
ctx.handleAction('videoChatMenuChoice',{dataset:{menuAction:'project'}});
assert('Add to project offers create-project option',ctx.modalLayer.innerHTML.includes('project:new'));
ctx.handleAction('videoPluginModalChoice',{dataset:{modalValue:'project:new'}});
assert('Project action creates project and assignment',prefs.projects.includes('Saved conversations')&&Object.keys(prefs.projectAssignments).length===1);
ctx.handleAction('videoPluginModalChoice',{dataset:{modalValue:'perm:Always ask'}});
assert('Plugin permission setting changes demo preference',prefs.permissionMode==='Always ask');
ctx.handleAction('videoChatMenuChoice',{dataset:{menuAction:'home'}});
assert('Add to Home saves conversation shortcut',prefs.savedHomeChats?.includes('Saved conversation'));
assert('saved-to-home chat appears on Home',ctx.pages.home().includes('Saved to Home'));
ctx.handleAction('videoChatMenuChoice',{dataset:{menuAction:'find'}});
assert('Find in chat route opens and filters current chat',ctx.pages.findInChat().includes('Hello from Nexa'));
ctx.handleAction('videoChatMenuChoice',{dataset:{menuAction:'uploads'}});
assert('Uploaded files route shows picker',ctx.pages.chatUploads().includes('chatUploadInput'));
ctx.handleAction('videoChatMenuChoice',{dataset:{menuAction:'archive'}});
assert('Archive action moves messages to archive and clears active chat',prefs.archivedChats?.length===1&&prefs.chatHistory.length===0);
assert('Archived chat can be restored from archive screen',ctx.pages.archivedChats().includes('Restore chat'));
ctx.prefs.chatHistory=[{role:'assistant',text:'Delete me'}];
ctx.handleAction('videoChatMenuChoice',{dataset:{menuAction:'delete'}});
ctx.handleAction('videoPluginModalChoice',{dataset:{modalValue:'deleteCurrent'}});
assert('Delete confirmation clears only demo chat data',prefs.chatHistory.length===0);
ctx.handleAction('toggleVideoPlugin',{dataset:{plugin:'GitHub'}});
assert('same plus control removes GitHub again',!prefs.videoPluginAdded.includes('GitHub'));
ctx.handleAction('videoPluginLocked',{dataset:{plugin:'Google Drive'}});
assert('Google Drive lock displays unverified lock explanation',ctx.modalLayer.innerHTML.includes('does not disclose'));
ctx.handleAction('openVideoPluginDetail',{dataset:{plugin:'Canva'}});
assert('plugin row opens its own detail page',currentPage==='videoPluginDetail'&&ctx.prefs.activeVideoPlugin==='Canva');

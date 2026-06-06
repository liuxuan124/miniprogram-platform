import os, sys  
p = r'D:\项目管理\小程序搭建与管理系统\miniapp\pages\mine\mine.wxml'  
with open(p, 'w', encoding='utf-8') as f:  
    f.write('AUTH_PROMPT_TEST')  
sys.stdout.write('Size: ' + str(os.path.getsize(p)) + '\n')  

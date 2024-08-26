 export async function bruteForceLibrary(pwd,passwordList) {
    const mode = 'Library'
    let startTime = Date.now();
    let time;
    let count;



        for (let i = 0; i < passwordList.length; i++) {
            
            if(pwd === passwordList[i]){
                count = i
                time = ((Date.now() - startTime)/1000) + ' sec';
                break;
            }else if(i === passwordList.length - 1){
                count = "not in list"
                time = ((Date.now() - startTime)/1000) + ' sec';
            }

        }

        return [pwd,count,mode,time];
      
}


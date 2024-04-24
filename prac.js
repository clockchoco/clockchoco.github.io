window.onload = () => {
    keys = ['Esc','`','1','2','3','4','5','6','7','8','9','0','-','=','Backspace','Home','PgUp','탐색','Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\','Del','End','PgDn','위로','Caps','a','s','d','f','g','h','j','k','l',';','\'','Enter','Insert','Pause','아래로','Shift','z','x','c','v','b','n','m',',','.','/','↑','Shift','PrtScn','ScrLk','고정','Func','Ctrl','Window','Alt','한자','','한/영','Alt','←','↓','→','문서','옵션','도움말','투명'];
    for(let i = 0;i < 18; i++) {
        const div_new = document.createElement('div');
        const span_new = document.createElement('span');
        if(i==15) {
            div_new.classList.add('TenKey');
        }
        div_new.append(span_new);
        div_new.classList.add('key');
        document.querySelector('.row1').append(div_new);
    }
    for(let i = 0; i < 18; i++) {
        const div_new = document.createElement('div');
        const span_new = document.createElement('span');
        if(i==15) {
            div_new.classList.add('TenKey');
        }
        div_new.append(span_new);
        div_new.classList.add('key');
        document.querySelector('.row2').append(div_new);
    }
    for(let i = 0; i < 16; i++) {
        const div_new = document.createElement('div');
        const span_new = document.createElement('span');
        if(i==13) {
            div_new.classList.add('TenKey');
        }
        div_new.append(span_new);
        div_new.classList.add('key');
        document.querySelector('.row3').append(div_new);
    }
    for(let i = 0; i < 16; i++) {
        const div_new = document.createElement('div');
        const span_new = document.createElement('span');
        if(i==13) {
            div_new.classList.add('TenKey');
        }
        div_new.append(span_new);
        div_new.classList.add('key');
        document.querySelector('.row4').append(div_new);
    }
    for(let i = 0; i < 15; i++) {
        const div_new = document.createElement('div');
        const span_new = document.createElement('span');
        if(i==12) {
            div_new.classList.add('TenKey');
        }
        div_new.append(span_new);
        div_new.classList.add('key');
        document.querySelector('.row5').append(div_new);
    }
    const spans = document.querySelectorAll('div div div span');
    for(let i = 0; i < keys.length;i++) {
        spans[i].textContent = keys[i];
    }
}
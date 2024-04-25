fetch('http://example.com')
  .then(response => response.text())
  .then(html => {
    // 웹 페이지 내용을 처리하는 코드 작성
    console.log(html);
  })
  .catch(error => {
    // 에러 처리 코드 작성
    console.error(error);
  });
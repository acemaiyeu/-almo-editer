import React, { Component } from 'react';
import DOMPurify from 'dompurify';

class DisplayContent extends Component {
  render() {
    // Giả sử đây là nội dung HTML lấy từ Database hoặc State
    const rawHTML = this.props.htmlFromEditor;

    // Tiến hành làm sạch HTML (loại bỏ các thẻ script, sự kiện onclick, onerror...)
    let cleanHTML = DOMPurify.sanitize(rawHTML);
    cleanHTML = cleanHTML.replace("<table>", "<table class='table table-bordered table-client' style='width: 100%'>")
    cleanHTML = cleanHTML.replace("td", "td style='height: auto !important' ")
    return (
      <div className="content-container">
        <div dangerouslySetInnerHTML={{ __html: cleanHTML }}/>
      </div>
    );
  }
}
export default DisplayContent;
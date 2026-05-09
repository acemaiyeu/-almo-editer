import React, { Component, createRef } from 'react';
import Quill from 'quill';
import DOMPurify from 'dompurify';
import 'quill/dist/quill.snow.css'; // Giao diện chuẩn

class WordEditor extends Component {
  constructor(props) {
    super(props);
    this.editorRef = createRef(); // Dùng Ref thay vì findDOMNode
    this.quill = null;
    this.state = {
      content: ''
    };
  }

  

  // componentDidMount() {
  //   // Khởi tạo Quill thủ công sau khi component mount
  //   if (this.editorRef.current) {
  //     this.quill = new Quill(this.editorRef.current, {
  //       theme: 'snow',
  //       modules: {
  //         toolbar: [
  //           [{ header: [1, 2, false] }],
  //           ['bold', 'italic', 'underline'],
  //           [{ list: 'ordered' }, { list: 'bullet' }],
  //           ['link', 'image'],
  //           ['clean']
  //         ]
  //       },
  //       placeholder: 'Bắt đầu soạn thảo văn bản...'
  //     });
  //     // Lắng nghe sự kiện thay đổi nội dung
  //     this.quill.on('text-change', () => {
  //       this.setState({
  //         // content: this.quill.root.innerHTML
  //         content: this.props.content ?? this.quill.root.innerHTML
  //       });
  //     });
  //   }
  // }
  componentDidMount() {
  if (this.editorRef.current) {
    this.quill = new Quill(this.editorRef.current, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [1, 2, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean']
        ]
      },
      placeholder: 'Bắt đầu soạn thảo văn bản...'
    });

    // Thiết lập nội dung ban đầu từ props (nếu có)
    if (this.props.content) {
      this.quill.root.innerHTML = this.props.content;
    }

    // Lắng nghe sự kiện thay đổi
    this.quill.on('text-change', () => {
      const html = this.quill.root.innerHTML;
      
      // Cập nhật state nội bộ
      this.setState({ content: html });

      // Gửi nội dung lên component cha (nếu cần)
      if (this.props.onChange) {
        this.props.onChange(html);
      }
    });
  }
}

  handleSave = () => {
    // Làm sạch HTML bằng DOMPurify trước khi xuất
    const cleanHTML = DOMPurify.sanitize(this.state.content);
    console.log("HTML an toàn để lưu:", cleanHTML);
    alert("Đã lưu HTML! Kiểm tra Console.");
  };


  componentDidUpdate = (prevState) => {
    if (this.state.content !== prevState.content) {
      this.props.getDataWord(this.state.content)
    }
  }
  render() {
    
    return (
  <div style={{ width: "100%" }}>
    <h2 style={{ fontSize: "1.1rem", fontWeight: "bold" }}>
      {/* Tên tiêu đề  */}
      {/* <span className="work-x-modal">
        <i className="bi bi-x-circle"></i>
      </span> */}
    </h2> 
    <div style={{ marginBottom: "20px" }}>
      <div ref={this.editorRef} style={{ height: "300px" }} />
    </div>
  </div>
);
  }
}

export default WordEditor;
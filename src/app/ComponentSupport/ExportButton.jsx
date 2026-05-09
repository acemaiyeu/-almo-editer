import React from 'react';
import * as XLSX from 'xlsx';

const ExportExcelButton = ({ data, fileName = 'export_data', title = 'Xuất Excel2' }) => {
  
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }
    alert(title)
    // 1. Lấy danh sách tất cả các key từ object đầu tiên để làm header
    // Ví dụ: { name: 'A', age: 20 } -> ["name", "age"]
    const headings = [Object.keys(data[0])];

    // 2. Tạo worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 3. (Tùy chọn) Ghi đè header nếu bạn muốn tùy chỉnh tên cột đẹp hơn
    // Ở đây chúng ta dùng mặc định từ keys của data props
    XLSX.utils.sheet_add_aoa(worksheet, headings, { origin: 'A1' });

    // 4. Tạo workbook và xuất file
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  return (
    <span 
      onClick={handleExport} 
      style={{ 
        cursor: 'pointer', 
        fontWeight: '500',
        textDecoration: 'underline' 
      }}
    >
      {title}
    </span>
  );
};

export default ExportExcelButton;
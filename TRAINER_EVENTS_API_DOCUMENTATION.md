# Trainer Events API Documentation

## Endpoint: Get Trainer Events

### URL

```
GET /api/v1/trainers/:id/events
```

### Description

Lấy danh sách sự kiện (booking và class sessions) của trainer trong một khoảng thời gian. Hỗ trợ nhiều chế độ xem (day, week, month, threeMonths, range) và các bộ lọc nâng cao.

### Path Parameters

- **id** (string, required): ID của trainer (trainerId hoặc userId của trainer)

### Query Parameters

#### Time Filter Parameters (Thời gian)

| Parameter   | Type       | Default         | Description                                                                         | Example                              |
| ----------- | ---------- | --------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| `viewType`  | string     | `'threeMonths'` | Loại xem dữ liệu. Giá trị: `'day'`, `'week'`, `'month'`, `'threeMonths'`, `'range'` | `viewType=month`                     |
| `date`      | string/ISO | Current Date    | Ngày làm mốc (cho day/week/month). Format: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)      | `date=2025-12-15T00:00:00.000Z`      |
| `year`      | number     | null            | Năm cụ thể (dùng với viewType 'week', 'month'). Range: 1900-2100                    | `year=2025`                          |
| `month`     | number     | null            | Tháng cụ thể (1-12). Dùng với year                                                  | `month=12`                           |
| `week`      | number     | null            | Tuần trong năm (1-53, ISO week). Dùng với year                                      | `week=50`                            |
| `startDate` | string/ISO | null            | Ngày bắt đầu (bắt buộc khi viewType='range'). Format: ISO 8601                      | `startDate=2025-12-01T00:00:00.000Z` |
| `endDate`   | string/ISO | null            | Ngày kết thúc (bắt buộc khi viewType='range'). Format: ISO 8601                     | `endDate=2025-12-31T23:59:59.999Z`   |

---

## Examples

### 1. Lấy sự kiện trong 3 tháng (mặc định)

```
GET /api/v1/trainers/507f1f77bcf86cd799439011/events
```

**Response Example:**

```json
[
  {
    "title": "Personal Training Session",
    "startTime": "2025-12-15T10:00:00.000Z",
    "endTime": "2025-12-15T11:00:00.000Z",
    "locationName": "Gym Center - Downtown",
    "userName": "John Doe",
    "note": "Focus on upper body strength",
    "price": 50000
  },
  {
    "title": "CrossFit Class",
    "startTime": "2025-12-15T14:00:00.000Z",
    "endTime": "2025-12-15T15:00:00.000Z",
    "locationName": "Gym Center - Downtown",
    "roomName": "Studio A",
    "sessionNumber": 5,
    "totalSessions": 12,
    "enrolledCount": 8,
    "capacity": 15
  }
]
```

---

### 2. Lấy sự kiện trong 1 ngày cụ thể

```
GET /api/v1/trainers/507f1f77bcf86cd799439011/events?viewType=day&date=2025-12-15T00:00:00.000Z
```

---

### 3. Lấy sự kiện trong 1 tuần (ISO week)

```
GET /api/v1/trainers/507f1f77bcf86cd799439011/events?viewType=week&year=2025&week=50
```

---

### 4. Lấy sự kiện trong 1 tháng cụ thể

```
GET /api/v1/trainers/507f1f77bcf86cd799439011/events?viewType=month&year=2025&month=12
```

---

### 5. Lấy sự kiện trong khoảng ngày tùy chỉnh

```
GET /api/v1/trainers/507f1f77bcf86cd799439011/events?viewType=range&startDate=2025-12-01T00:00:00.000Z&endDate=2025-12-31T23:59:59.999Z
```

---

## Response Structure

### Success Response (200 OK)

```json
[
  {
    "_id": "507f1f77bcf86cd799439015",
    "title": "Personal Training",
    "startTime": "2025-12-15T10:00:00.000Z",
    "endTime": "2025-12-15T11:00:00.000Z",
    "locationName": "Gym Center",
    "userName": "John Doe",
    "note": "Upper body training",
    "price": 50000
  },
  {
    "_id": "507f1f77bcf86cd799439016",
    "title": "Yoga Class",
    "startTime": "2025-12-15T14:00:00.000Z",
    "endTime": "2025-12-15T15:00:00.000Z",
    "locationName": "Gym Center",
    "roomName": "Studio B",
    "sessionNumber": 3,
    "totalSessions": 10,
    "enrolledCount": 12,
    "capacity": 20
  }
]
```

---

## Response Fields

### Booking Events Fields

| Field          | Type              | Description                   |
| -------------- | ----------------- | ----------------------------- |
| `_id`          | ObjectId          | ID của booking                |
| `title`        | string            | Tên của booking               |
| `startTime`    | string (ISO 8601) | Thời gian bắt đầu             |
| `endTime`      | string (ISO 8601) | Thời gian kết thúc            |
| `locationName` | string            | Tên địa điểm                  |
| `userName`     | string            | Tên khách hàng đã đặt booking |
| `note`         | string            | Ghi chú của booking           |
| `price`        | number            | Giá booking (đơn vị: VNĐ)     |
| `status`       | string            | trạng thái của booking        |

### Class Session Events Fields

| Field           | Type              | Description              |
| --------------- | ----------------- | ------------------------ |
| `_id`           | ObjectId          | ID của class session     |
| `title`         | string            | Tên của class            |
| `startTime`     | string (ISO 8601) | Thời gian bắt đầu        |
| `endTime`       | string (ISO 8601) | Thời gian kết thúc       |
| `locationName`  | string            | Tên địa điểm             |
| `roomName`      | string            | Tên phòng                |
| `sessionNumber` | number            | Buổi thứ mấy (tính từ 1) |
| `totalSessions` | number            | Tổng số buổi của class   |
| `enrolledCount` | number            | Số học viên đã đăng ký   |
| `capacity`      | number            | Sức chứa của class       |

---

## Error Responses

### 404 Not Found - Trainer không tồn tại

```json
{
  "success": false,
  "message": "Trainer not found",
  "error": "Trainer not found"
}
```

### 400 Bad Request - startDate/endDate bị thiếu (khi viewType='range')

```json
{
  "success": false,
  "message": "startDate and endDate are required for viewType 'range'",
  "error": "startDate and endDate are required for viewType 'range'"
}
```

### 400 Bad Request - viewType không hợp lệ

```json
{
  "success": false,
  "message": "Invalid viewType: invalid_type",
  "error": "Invalid viewType: invalid_type"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Error getting trainer events for three months",
  "error": "Error details here"
}
```

---

## Query Parameter Combinations Guide

| Scenario                  | viewType      | Required Params        | Optional Params |
| ------------------------- | ------------- | ---------------------- | --------------- |
| 3 tháng gần đây (Default) | `threeMonths` | -                      | `date`          |
| 1 ngày cụ thể             | `day`         | -                      | `date`          |
| 1 tuần cụ thể             | `week`        | `year`, `week`         | `date`          |
| 1 tháng cụ thể            | `month`       | `year`, `month`        | `date`          |
| Khoảng ngày tùy chỉnh     | `range`       | `startDate`, `endDate` | -               |

---

## Usage Examples (Frontend)

### JavaScript / Fetch API

```javascript
// 1. Lấy 3 tháng gần đây (mặc định)
fetch('/api/v1/trainers/507f1f77bcf86cd799439011/events')
  .then((res) => res.json())
  .then((data) => console.log(data))

// 2. Lấy ngày hôm nay
const today = new Date().toISOString()
fetch(`/api/v1/trainers/507f1f77bcf86cd799439011/events?viewType=day&date=${today}`)
  .then((res) => res.json())
  .then((data) => console.log(data))

// 3. Lấy tháng 12 năm 2025
fetch('/api/v1/trainers/507f1f77bcf86cd799439011/events?viewType=month&year=2025&month=12')
  .then((res) => res.json())
  .then((data) => console.log(data))

// 4. Lấy tuần 50 năm 2025
fetch('/api/v1/trainers/507f1f77bcf86cd799439011/events?viewType=week&year=2025&week=50')
  .then((res) => res.json())
  .then((data) => console.log(data))

// 5. Lấy khoảng ngày tùy chỉnh
const startDate = new Date('2025-12-01').toISOString()
const endDate = new Date('2025-12-31').toISOString()
fetch(`/api/v1/trainers/507f1f77bcf86cd799439011/events?viewType=range&startDate=${startDate}&endDate=${endDate}`)
  .then((res) => res.json())
  .then((data) => console.log(data))
```

### Using Axios

```javascript
import axios from 'axios'

// Tùy chọn cơ bản
const getTrainerEvents = async (trainerId, viewType = 'threeMonths', options = {}) => {
  try {
    const params = { viewType, ...options }
    const response = await axios.get(`/api/v1/trainers/${trainerId}/events`, { params })
    return response.data
  } catch (error) {
    console.error('Error fetching trainer events:', error)
  }
}

// Sử dụng
getTrainerEvents('507f1f77bcf86cd799439011', 'month', { year: 2025, month: 12 })
```

## Date Format Guidelines

### ISO 8601 Format

Tất cả các thông số ngày/thời gian phải ở dạng ISO 8601:

**Format:** `YYYY-MM-DDTHH:mm:ss.sssZ`

**Examples:**

- `2025-12-15T10:30:00.000Z` - 15/12/2025 lúc 10:30:00
- `2025-12-01T00:00:00.000Z` - Đầu ngày 01/12/2025
- `2025-12-31T23:59:59.999Z` - Cuối ngày 31/12/2025

**JavaScript:**

```javascript
// Lấy ISO string từ Date object
const date = new Date('2025-12-15')
console.log(date.toISOString()) // 2025-12-15T00:00:00.000Z

// Tạo Date từ string
const dateString = '2025-12-15T10:30:00.000Z'
const date = new Date(dateString)
```

---

## Rate Limiting

Không có giới hạn tỷ lệ cụ thể cho endpoint này. Vui lòng tuân theo chính sách rate limiting chung của API.

---

## Notes

- Tất cả dữ liệu được trả về được sắp xếp theo `startTime` (từ sớm nhất đến muộn nhất)
- Nếu không có sự kiện nào trong khoảng thời gian được chỉ định, API sẽ trả về một mảng rỗng `[]`
- Chỉ những sự kiện chưa bị xóa mềm (`_destroy: false`) mới được trả về
- Booking events và class session events được kết hợp và sắp xếp chung theo thời gian

---

## Last Updated

December 11, 2025

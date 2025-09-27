// import React, { useState, useEffect } from "react";
// import { Calendar, dateFnsLocalizer } from "react-big-calendar";
// import format from "date-fns/format";
// import parse from "date-fns/parse";
// import startOfWeek from "date-fns/startOfWeek";
// import getDay from "date-fns/getDay";
// import "react-big-calendar/lib/css/react-big-calendar.css";
// import enUS from "date-fns/locale/en-US";
// import CustomToolbar from './customCal';
// import axios from "axios";

// import "./calendar.scss";

// const locales = {
//   "en-US": enUS,
// };

// const localizer = dateFnsLocalizer({
//   format,
//   parse,
//   startOfWeek,
//   getDay,
//   locales,
// });

// const formats = {
//   timeGutterFormat: () => "",
//   eventTimeRangeFormat: () => "", 
//   agendaTimeRangeFormat: () => "", 
// };

// // define category colors for transactions
// const categoryColors = {
//   "Food and Drink": "#FFB6C1", // Light pink
//   Travel: "#ADD8E6", // Light blue
//   Entertainment: "#FFD700", // Gold
//   Bills: "#90EE90", // Light green
//   Income: "#87CEEB", // Sky blue
//   Payment: "#90EE90", // Medium purple
//   Transfer: "#90EE90", // Steel blue
//   Uncategorized: "#D3D3D3", // Light gray
// };

// // extract the primary category
// const getPrimaryCategory = (category) => {
//   if (!category) return "Uncategorized";
//   const primaryCategory = category.split(",")[0].trim();
//   console.log("Extracted Primary Category:", primaryCategory); // Debug log
//   return primaryCategory;
// };

// //  to assign times to transactions
// const assignTransactionTimes = (transactions) => {
//   const transactionsByDate = {};

//   // grouping our transactions by date
//   transactions.forEach((transaction) => {
//     const date = new Date(transaction.date).toDateString(); 
//     if (!transactionsByDate[date]) {
//       transactionsByDate[date] = [];
//     }
//     transactionsByDate[date].push(transaction);
//   });

//   // assigning times to transactions
//   Object.keys(transactionsByDate).forEach((date) => {
//     let currentHour = 8; // 8am start
//     transactionsByDate[date].forEach((transaction) => {
//       const startDate = new Date(transaction.date);
//       startDate.setHours(currentHour, 0, 0, 0);

//       const endDate = new Date(startDate);
//       endDate.setHours(currentHour + 1); // Increment by 2 hours

//       transaction.start = startDate;
//       transaction.end = endDate;

//       currentHour += 1; // Move to the next 2-hour block
//       if (currentHour >= 16) {
//         currentHour = 8; // Reset to 8 AM if exceeding 4 PM
//       }
//     });
//   });

//   return transactions;
// };

// const CalendarCard = () => {
//   const [events, setEvents] = useState([]);

//   const fetchTransactions = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const response = await axios.get("http://localhost:8000/user_transactions/", {
//         headers: { Authorization: `Bearer ${token}` },
//         withCredentials: true,
//       });
  
//       console.log("API Response:", response.data); 
  
//       const { db_transactions } = response.data;
  
//       const transformedEvents = assignTransactionTimes(db_transactions).map((transaction) => ({
//         id: transaction.id || `event-${Math.random()}`, 
//         title: transaction.merchant_name || transaction.category || "Untitled Transaction", 
//         category: transaction.category || "Uncategorized",
//         start: transaction.start,
//         end: transaction.end,
//       }));
  
//       console.log("Transformed Events:", transformedEvents); 
  
//       setEvents(transformedEvents); 
//     } catch (error) {
//       console.error("Error fetching transactions:", error.response ? error.response.data : error);
//     }
//   };

//   useEffect(() => {
//     fetchTransactions(); 
//   }, []);

//   const EventComponent = ({ event }) => {
//     const primaryCategory = getPrimaryCategory(event.category);
//     const backgroundColor = categoryColors[primaryCategory] || categoryColors["Uncategorized"];

//     return (
//       <div
//         style={{
//           backgroundColor,
//           color: "#000",
//           width: "100%",
//           height: "100%",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           borderRadius: "5px",
//           boxSizing: "border-box",
//           fontSize: "0.9rem",
//         }}
//       >
//         {event.title}
//       </div>
//     );
//   };

//   return (
//     <div
//       style={{
//         fontFamily: "Quicksand",
//         height: "40vh",
//         padding: "10px",
//         backgroundColor: "#fff",
//         borderRadius: "10px",
//         boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
//       }}
//     >
//       <Calendar
//         localizer={localizer}
//         events={events}
//         startAccessor="start"
//         endAccessor="end"
//         defaultView="week"
//         views={["week", "month"]}
//         formats={formats}
//         style={{ height: "100%" }}
//         showMultiDayTimes={false}
//         min={new Date(2025, 3, 6, 8, 0)}
//         max={new Date(2025, 3, 6, 16, 0)}
//         components={{
//           event: EventComponent,
//           toolbar: CustomToolbar,
//         }}
//       />
//     </div>
//   );
// };

// export default CalendarCard;
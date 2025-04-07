import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import "react-big-calendar/lib/css/react-big-calendar.css";
import enUS from 'date-fns/locale/en-US';

import './calendar.scss';

const locales = {
  'en-US': enUS,
};


const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarCard = () => {
  const [events, setEvents] = useState([
    {
      title: "Groceries",
      start: new Date(2025, 3, 6, 14, 0), 
      end: new Date(2025, 3, 6, 15, 0),
      id: 1,
    },
    {
      title: "Payday",
      start: new Date(2025, 3, 8, 9, 0),
      end: new Date(2025, 3, 8, 10, 0),
      id: 2,
    },
  ]);

  return (
    <div style={{
        height: "300px", 
        padding: "10px",
        backgroundColor: "#fff", 
        borderRadius: "10px", 
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}>
      {/* <h3 style={{ marginBottom: "10px" }}></h3> */}
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView="week"
        views={["week", "month"]}
        style={{ height: "100%" }}
      />
    </div>
  );
};

export default CalendarCard;
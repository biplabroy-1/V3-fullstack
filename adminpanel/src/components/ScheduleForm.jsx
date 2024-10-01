import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from './Modal';

const API_BASE_URL = "http://localhost:5000/api/schedule";

const initialSchedule = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
};

const periodTimes = [
    { period: 1, start: "08:00", end: "09:00" },
    { period: 2, start: "09:00", end: "10:00" },
    { period: 3, start: "10:00", end: "11:00" },
    { period: 4, start: "11:00", end: "12:00" },
    { period: 5, start: "12:00", end: "13:00" },
    { period: 6, start: "13:00", end: "14:00" },
    { period: 7, start: "14:00", end: "15:00" },
    { period: 8, start: "15:00", end: "16:00" },
    { period: 9, start: "16:00", end: "17:00" },
    { period: 10, start: "17:00", end: "18:00" },
    { period: 11, start: "18:00", end: "19:00" },
];

const ScheduleForm = () => {
    const [formData, setFormData] = useState({
        ID: "",
        selectedID: "",
        university: "",
        program: "",
        section: "",
        semester: "",
        schedule: initialSchedule,
    });
    const [allIDs, setAllIDs] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [classToDelete, setClassToDelete] = useState(null);
    const [currentDay, setCurrentDay] = useState("Monday");

    const fetchIDs = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/ids`);
            setAllIDs(response.data.ids);
        } catch (error) {
            console.error("Error fetching IDs:", error);
            toast.error("Error fetching IDs");
        }
    }, []);

    useEffect(() => {
        fetchIDs();
    }, [fetchIDs]);

    useEffect(() => {
        const { program, section, semester, university } = formData;
        if (program && section && semester && university) {
            setFormData(prev => ({ ...prev, ID: `${university}-${program}-${semester}-${section}` }));
        } else {
            setFormData(prev => ({ ...prev, ID: "" }));
        }
    }, [formData.program, formData.section, formData.semester, formData.university]);

    useEffect(() => {
        if (formData.selectedID) {
            fetchScheduleByID(formData.selectedID);
        }
    }, [formData.selectedID]);

    const fetchScheduleByID = async (id) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/find/${id}`);
            const { semester, program, section, university, schedule } = response.data;
            setFormData(prev => ({
                ...prev,
                semester,
                program,
                section,
                university,
                schedule,
                ID: id,
            }));
        } catch (error) {
            console.error("Error fetching schedule:", error);
            toast.error("Error fetching schedule");
        }
    };

    const handleAddClass = (day) => {
        const existingClasses = formData.schedule[day];
        const lastClass = existingClasses[existingClasses.length - 1];
        const startTime = lastClass ? lastClass.End_Time : "08:00";
        const periodIndex = periodTimes.findIndex(period => period.start === startTime);
        const newPeriod = periodIndex + 1;
        const newClass = {
            Period: newPeriod,
            Start_Time: startTime,
            End_Time: periodTimes[periodIndex].end,
            Course_Name: "",
            Instructor: "",
            Room: "",
            Group: "All",
            Class_Duration: 1,
            Class_type: "Theory",
        };
        setFormData(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: [...prev.schedule[day], newClass],
            }
        }));
    };

    const handleRemoveClass = (day, index) => {
        setClassToDelete({ day, index });
        setIsModalOpen(true);
    };

    const confirmRemoveClass = () => {
        if (classToDelete) {
            const { day, index } = classToDelete;
            setFormData(prev => ({
                ...prev,
                schedule: {
                    ...prev.schedule,
                    [day]: prev.schedule[day].filter((_, idx) => idx !== index),
                }
            }));
            setIsModalOpen(false);
            setClassToDelete(null);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    };

    const calculateEndTime = (startTime, duration) => {
        const startIndex = periodTimes.findIndex(period => period.start === startTime);
        const endIndex = Math.min(startIndex + duration - 1, periodTimes.length - 1);
        return periodTimes[endIndex].end;
    };

    const handleClassChange = (day, index, field, value) => {
        setFormData(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: prev.schedule[day].map((cls, idx) => {
                    if (idx === index) {
                        let updatedClass = { ...cls, [field]: value };
                        if (field === "Period") {
                            const selectedPeriod = periodTimes.find(p => p.period === parseInt(value));
                            updatedClass.Start_Time = selectedPeriod.start;
                            updatedClass.End_Time = calculateEndTime(selectedPeriod.start, updatedClass.Class_Duration);
                        } else if (field === "Start_Time") {
                            updatedClass.Period = periodTimes.find(p => p.start === value).period;
                            updatedClass.End_Time = calculateEndTime(value, updatedClass.Class_Duration);
                        } else if (field === "Class_Duration") {
                            updatedClass.End_Time = calculateEndTime(updatedClass.Start_Time, parseInt(value));
                        }
                        return updatedClass;
                    }
                    return cls;
                }),
            }
        }));

        // Update subsequent classes' start times
        if (field === "End_Time" || field === "Class_Duration") {
            setFormData(prev => ({
                ...prev,
                schedule: {
                    ...prev.schedule,
                    [day]: prev.schedule[day].map((cls, idx) => {
                        if (idx > index) {
                            const prevClass = prev.schedule[day][idx - 1];
                            const updatedClass = {
                                ...cls,
                                Start_Time: prevClass.End_Time,
                                Period: periodTimes.find(p => p.start === prevClass.End_Time).period,
                                End_Time: calculateEndTime(prevClass.End_Time, cls.Class_Duration)
                            };
                            return updatedClass;
                        }
                        return cls;
                    }),
                }
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Filter out empty days from the schedule
            const filteredSchedule = Object.entries(formData.schedule).reduce((acc, [day, classes]) => {
                if (classes.length > 0) {
                    acc[day] = classes;
                }
                return acc;
            }, {});

            // Validate required fields for non-free classes
            for (const day in filteredSchedule) {
                for (const cls of filteredSchedule[day]) {
                    if (cls.Class_type !== "Free") {
                        if (!cls.Course_Name || !cls.Instructor || !cls.Room) {
                            toast.error(`Course Name, Instructor, and Room are required for non-free classes.`);
                            return;
                        }
                    }
                }
            }

            const dataToSend = {
                ...formData,
                schedule: filteredSchedule
            };

            const response = await axios.post(`${API_BASE_URL}/add`, dataToSend);
            toast.success(response.data.message);
        } catch (error) {
            console.error("There was an error adding the schedule:", error);
            toast.error("There was an error adding the schedule.");
        }
    };

    const handleDeleteSchedules = (e) => {
        e.preventDefault();
        if (!formData.selectedID) {
            toast.warn("Nothing is selected");
            return;
        }
        setIsModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            const response = await axios.delete(`${API_BASE_URL}/delete/${formData.selectedID}`);
            toast.success(response.data.message);
            setIsModalOpen(false);
            setFormData(prev => ({ ...prev, selectedID: "" }));
            fetchIDs();
        } catch (error) {
            console.error("There was an error deleting the schedule:", error);
            toast.error("There was an error deleting the schedule.");
        }
    };

    const handleDayChange = (day) => {
        setCurrentDay(day);
    };

    return (
        <div className="bg-white shadow-lg rounded-lg p-8 mb-4 w-full max-w-full mx-auto">
            <ToastContainer stacked
                position="bottom-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
                transition:Bounce />
            <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-1/3 mb-6 md:mr-4">
                    <h2 className="text-xl font-bold mb-4">Schedule ID</h2>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2" htmlFor="selectedID">
                            Select ID:
                        </label>
                        <select
                            id="selectedID"
                            className="shadow cursor-pointer appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={formData.selectedID}
                            onChange={(e) => setFormData(prev => ({ ...prev, selectedID: e.target.value }))}
                        >
                            <option className="hidden" value="">
                                Select Existing ID
                            </option>
                            {allIDs.map((id) => (
                                <option key={id} value={id}>
                                    {id}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2" htmlFor="ID">
                            ID:
                        </label>
                        <input
                            id="ID"
                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            type="text"
                            name="ID"
                            value={formData.ID}
                            readOnly
                        />
                        <button onClick={handleDeleteSchedules} className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                            Delete This
                        </button>
                    </div>
                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onConfirm={classToDelete ? confirmRemoveClass : handleConfirmDelete}
                        message={classToDelete ? "Are you sure you want to delete this class?" : "Are you sure you want to delete this schedule?"}
                    />

                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2" htmlFor="university">
                            University:
                        </label>
                        <input
                            id="university"
                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            type="text"
                            name="university"
                            value={formData.university}
                            onChange={handleInputChange}
                            placeholder="Enter university (e.g., BWU)"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2" htmlFor="program">
                            Program:
                        </label>
                        <input
                            id="program"
                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            type="text"
                            name="program"
                            value={formData.program}
                            onChange={handleInputChange}
                            placeholder="Enter Program (e.g., BCA)"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2" htmlFor="semester">
                            Semester:
                        </label>
                        <select
                            id="semester"
                            className="shadow cursor-pointer appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            name="semester"
                            value={formData.semester}
                            onChange={handleInputChange}
                        >
                            <option className="hidden" value="">
                                Select Semester
                            </option>
                            {Array.from({ length: 9 }, (_, i) => (
                                <option key={i} value={i + 1}>{i + 1}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2" htmlFor="section">
                            Section:
                        </label>
                        <input
                            id="section"
                            className="shadow uppercase appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            type="text"
                            name="section"
                            value={formData.section}
                            onChange={handleInputChange}
                            placeholder="Enter Section (e.g., A)"
                        />
                    </div>
                    
                    <button
                        onClick={handleSubmit}
                        className="bg-green-500 duration-300 hover:bg-green-700 text-white font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline mt-4"
                    >
                        Add/Update Schedule
                    </button>
                </div>

                <div className="w-full md:w-2/3">
                    <h2 className="text-xl font-bold mb-4">Class Schedule</h2>
                    <div className="flex mb-4 overflow-x-auto">
                        {Object.keys(formData.schedule).map((day) => (
                            <button
                                key={day}
                                className={`mr-2 px-4 py-2 rounded whitespace-nowrap ${
                                    currentDay === day ? 'bg-blue-500 text-white' : 'bg-gray-200'
                                }`}
                                onClick={() => handleDayChange(day)}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-700 font-bold mb-4">{currentDay}</h3>
                            <button
                                type="button"
                                className="bg-blue-500 duration-300 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
                                onClick={() => handleAddClass(currentDay)}
                            >
                                Add Class
                            </button>
                        </div>
                        
                        <div className="flex overflow-x-auto pb-4">
                            {formData.schedule[currentDay].map((cls, index) => (
                                <div key={index} className="bg-gray-100 p-6 rounded-lg mr-4 min-w-[300px]">
                                    <button
                                        type="button"
                                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mb-2 float-right"
                                        onClick={() => handleRemoveClass(currentDay, index)}
                                    >
                                        Remove
                                    </button>
                                    <div className="mb-4">
                                        <label
                                            className="block text-gray-700 font-bold mb-2"
                                            htmlFor={`${currentDay}-period-${index}`}
                                        >
                                            Period:
                                        </label>
                                        <select
                                            id={`${currentDay}-period-${index}`}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            value={cls.Period}
                                            onChange={(e) =>
                                                handleClassChange(currentDay, index, "Period", e.target.value)
                                            }
                                        >
                                            {periodTimes.map((period) => (
                                                <option key={period.period} value={period.period}>
                                                    {period.period}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-4">
                                        <label
                                            className="block text-gray-700 font-bold mb-2"
                                            htmlFor={`${currentDay}-start-time-${index}`}
                                        >
                                            Start Time:
                                        </label>
                                        <select
                                            id={`${currentDay}-start-time-${index}`}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            value={cls.Start_Time}
                                            onChange={(e) =>
                                                handleClassChange(currentDay, index, "Start_Time", e.target.value)
                                            }
                                        >
                                            {periodTimes.map((period) => (
                                                <option key={period.start} value={period.start}>
                                                    {period.start}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-4">
                                        <label
                                            className="block text-gray-700 font-bold mb-2"
                                            htmlFor={`${currentDay}-class-duration-${index}`}
                                        >
                                            Class Duration:
                                        </label>
                                        <select
                                            id={`${currentDay}-class-duration-${index}`}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            value={cls.Class_Duration}
                                            onChange={(e) =>
                                                handleClassChange(
                                                    currentDay,
                                                    index,
                                                    "Class_Duration",
                                                    parseInt(e.target.value)
                                                )
                                            }
                                        >
                                            {[1, 2, 3, 4].map((duration) => (
                                                <option key={duration} value={duration}>
                                                    {duration} hour{duration > 1 ? "s" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-4">
                                        <label
                                            className="block text-gray-700 font-bold mb-2"
                                            htmlFor={`${currentDay}-class-type-${index}`}
                                        >
                                            Class Type:
                                        </label>
                                        <select
                                            id={`${currentDay}-class-type-${index}`}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            value={cls.Class_type}
                                            onChange={(e) =>
                                                handleClassChange(currentDay, index, "Class_type", e.target.value)
                                            }
                                        >
                                            <option value="Theory">Theory</option>
                                            <option value="Lab">Lab</option>
                                            <option value="Free">Free</option>
                                        </select>
                                    </div>

                                    {cls.Class_type !== "Free" && (
                                        <>
                                            <div className="mb-4">
                                                <label
                                                    className="block text-gray-700 font-bold mb-2"
                                                    htmlFor={`${currentDay}-course-name-${index}`}
                                                >
                                                    Course Name:
                                                </label>
                                                <input
                                                    id={`${currentDay}-course-name-${index}`}
                                                    className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                    type="text"
                                                    value={cls.Course_Name}
                                                    onChange={(e) =>
                                                        handleClassChange(currentDay, index, "Course_Name", e.target.value)
                                                    }
                                                    required
                                                />
                                            </div>

                                            <div className="mb-4">
                                                <label
                                                    className="block text-gray-700 font-bold mb-2"
                                                    htmlFor={`${currentDay}-instructor-${index}`}
                                                >
                                                    Instructor:
                                                </label>
                                                <input
                                                    id={`${currentDay}-instructor-${index}`}
                                                    className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                    type="text"
                                                    value={cls.Instructor}
                                                    onChange={(e) =>
                                                        handleClassChange(currentDay, index, "Instructor", e.target.value)
                                                    }
                                                    required
                                                />
                                            </div>

                                            <div className="mb-4">
                                                <label
                                                    className="block text-gray-700 font-bold mb-2"
                                                    htmlFor={`${currentDay}-room-${index}`}
                                                >
                                                    Room:
                                                </label>
                                                <input
                                                    id={`${currentDay}-room-${index}`}
                                                    className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                    type="text"
                                                    value={cls.Room}
                                                    onChange={(e) =>
                                                        handleClassChange(currentDay, index, "Room", e.target.value)
                                                    }
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="mb-4">
                                        <label
                                            className="block text-gray-700 font-bold mb-2"
                                            htmlFor={`${currentDay}-group-${index}`}
                                        >
                                            Group:
                                        </label>
                                        <select
                                            id={`${currentDay}-group-${index}`}
                                            className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            value={cls.Group}
                                            onChange={(e) =>
                                                handleClassChange(currentDay, index, "Group", e.target.value)
                                            }
                                        >
                                            <option value="All">All</option>
                                            <option value="Group 1">Group 1</option>
                                            <option value="Group 2">Group 2</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleForm;

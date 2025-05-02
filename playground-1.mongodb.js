
use('zivon');
db.getCollection('clients').insertMany([
    {
        memberID: "MBR00001",
        name: "ANAND VELU",
        mobile: "9894499999",
        email: "anand.velu@example.com",
        dob: new Date("1990-01-01"), // placeholder
        gender: "Male",
        joinDate: new Date("2022-04-01"),
        medicalHistory: "None"
    },
    {
        memberID: "MBR00002",
        name: "AMBUJA EASWARAN",
        mobile: "9500057512",
        email: "ambuja.easwaran@example.com",
        dob: new Date("1990-01-01"),
        gender: "Female",
        joinDate: new Date("2021-09-01"),
        medicalHistory: "None"
    },
    {
        memberID: "MBR00003",
        name: "BALA MURALI",
        mobile: "9500928899",
        email: "bala.murali@example.com",
        dob: new Date("1990-01-01"),
        gender: "Male",
        joinDate: new Date("2021-01-01"),
        medicalHistory: "None"
    },
    {
        memberID: "MBR00004",
        name: "DR. MADHU SUDHAN",
        mobile: "9364469131",
        email: "madhu.sudhan@example.com",
        dob: new Date("1985-06-15"),
        gender: "Male",
        joinDate: new Date("2021-08-10"),
        medicalHistory: "None"
    },
    {
        memberID: "MBR00005",
        name: "JOHN BERLIN",
        mobile: "9751903669",
        email: "john.berlin@example.com",
        dob: new Date("1992-03-04"),
        gender: "Male",
        joinDate: new Date("2024-04-03"),
        medicalHistory: "None"
    },
    {
        memberID: "MBR00006",
        name: "DIWAKAR R",
        mobile: "9688212898",
        email: "diwakar.r@example.com",
        dob: new Date("1991-10-01"),
        gender: "Male",
        joinDate: new Date("2023-10-01"),
        medicalHistory: "None"
    },
    {
        memberID: "MBR00007",
        name: "PRIYA DARSHINI",
        mobile: "9578553834",
        email: "priya.darshini@example.com",
        dob: new Date("1993-06-05"),
        gender: "Female",
        joinDate: new Date("2023-05-06"),
        medicalHistory: "None"
    },
    {
        memberID: "MBR00008",
        name: "JAYANTHI P",
        mobile: "9842169169",
        email: "jayanthi.p@example.com",
        dob: new Date("1989-02-05"),
        gender: "Female",
        joinDate: new Date("2021-02-05"),
        medicalHistory: "None"
    },
    {
        memberID: "MBR00009",
        name: "THANNUSH S.P",
        mobile: "7708659561",
        email: "thannush.sp@example.com",
        dob: new Date("2000-01-04"),
        gender: "Male",
        joinDate: new Date("2021-01-04"),
        medicalHistory: "None"
    },
    {
        memberID: "MBR00010",
        name: "NAVIN KUMAR",
        mobile: "9677786869",
        email: "navin.kumar@example.com",
        dob: new Date("1994-09-18"),
        gender: "Male",
        joinDate: new Date("2023-09-18"),
        medicalHistory: "None"
    }
]);

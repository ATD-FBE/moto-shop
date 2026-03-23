export interface ICompanyDetails {
    _id: string;
    companyName: string;
    shopName: string;
    inn: string;
    ogrn: string;
    phone: string;
    emails: {
        info: string;
        payments: string;
        opt: string;
    };
    legalAddress: string;
    displayAddress: string;
    bank: {
        name: string;
        bik: string;
        rs: string;
        ks: string;
    };
}

export interface IWorkingHours {
    days: string;
    time: string;
    closed?: boolean;
}

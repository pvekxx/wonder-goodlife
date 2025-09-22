export type Car = {
    id: string;
    name: string;
    brand: string;
    segment: string;
    fuel: string;
    specs: {
        priceRange: [number, number];
        fuel: string;
        efficiency: string;
        power: string;
        torque: string;
        displacement: string;
        engine: string;
        transmission: string;
        seats: number;
    };
    img: string;
    colors: {
        code: string;
        name: string;
    }[];
    optionsCatalog: {
        code: string;
        name: string;
        kind: string;
        desc: string;
    }[];
    trims: {
        code: string;
        name: string;
        basePrice: number;
        standardFeatures: string;
        options: {
            code: string;
            price: number;
            allowed: boolean;
            included?: boolean;
            requires?: string[];
        }[];
        allowedColorCodes: string[];
    }[];
    rules: {
        when: {
            trim: string;
            option: string;
        };
        requiresColorAnyOf: string[];
    }[];
};
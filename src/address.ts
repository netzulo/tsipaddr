import {
    addByteArrays,
    ByteArray,
    compareByteArrays,
    comparison,
    substractByteArrays,
} from "./arrays";

import {
    AddressValueError,
} from "./exceptions";

import {
    DECIMAL_DIGITS,
    IPV4_BYTES,
} from "./constants";


export abstract class Address {
    private _octets: ByteArray;

    public constructor(octets: ByteArray) {
        this._octets = octets;
    }

    abstract get ipString(): string;

    get octets(): ByteArray {
        return this._octets;
    }

    public toString(): string {
        return this.ipString;
    }

    public eq(other: this): boolean {
        return compareByteArrays(this.octets, other.octets) === comparison.Equal;
    }

    public ne(other: this): boolean {
        return compareByteArrays(this.octets, other.octets) !== comparison.Equal;
    }

    public gt(other: this): boolean {
        return compareByteArrays(this.octets, other.octets) === comparison.Greater;
    }

    public lt(other: this): boolean {
        return compareByteArrays(this.octets , other.octets ) === comparison.Lesser;
    }

    public ge(other: this): boolean {
        const result = compareByteArrays(this.octets , other.octets );
        return result === comparison.Greater || result === comparison.Equal;
    }

    public le(other: this): boolean {
        const result = compareByteArrays(this.octets , other.octets );
        return result === comparison.Lesser || result === comparison.Equal;
    }

    public add(amount: ReadonlyArray<number>): this {
        return new (this.constructor as any)(addByteArrays(this.octets , new Uint8Array(amount)));
    }

    public substract(amount: ReadonlyArray<number>): this {
        return new (this.constructor as any)(substractByteArrays(this.octets , new Uint8Array(amount)));
    }
}


export class Address4 extends Address {
    private _ipString: string;

    public constructor(input: string | ReadonlyArray<number> | ByteArray) {
        if (input instanceof Uint8Array) {
            super(input);
        } else if (input instanceof Array) {
            if (input.length > IPV4_BYTES) {
                throw new AddressValueError(input);
            }
            if (!input.every((octet) => this.isValidOctet(octet))) {
                throw new AddressValueError(input);
            }
            if (input.length < IPV4_BYTES) {
                input = Array(IPV4_BYTES - input.length).fill(0x00).concat(input);
            }
            super(new Uint8Array(input));
        } else if (typeof input === "string") {
            const addressSplitted = input.split(".");
            if (addressSplitted.length !== IPV4_BYTES) {
                throw new AddressValueError(input);
            }

            const octets = new Uint8Array(addressSplitted.map(
                (octet) => {
                    if (!Array.from(octet).every((ch) => DECIMAL_DIGITS.includes(ch))) {
                        throw new AddressValueError(input as string);
                    }

                    const numberOctet = parseInt(octet, 10);
                    if (!this.isValidOctet(numberOctet)) {
                        throw new AddressValueError(input as string);
                    }

                    return numberOctet;
                },
            ));
            super(octets);
        }
    }

    public get ipString() {
        if (typeof this._ipString === "undefined") {
            this._ipString = this.octets.join(".");
        }
        return this._ipString;
    }

    private isValidOctet(octet: number): boolean {
        return octet >= 0 && octet <= 255;
    }
}

import {
    ByteContainer,
    comparison,
    isDecimalString,
    isHexadecimalString,
    isValidByte,
    isValidByteArray,
} from "./arrays";

import {
    AddressValueError,
} from "./exceptions";

import {
    IPV4_BYTES,
    IPV6_BYTES,
    IPV6_LENGTH,
    IPV6_SEGMENT_LENGTH,
} from "./constants";


/**
 * @hidden
 */
function hexOctetToString(octet: number): string {
    return octet.toString(16).padStart(2, "0");
}


/**
 * Base class for address implementations.
 *
 * This class is abstract and not meant to be used directly outside of the
 * library except for type declarations and checks.
 */
export abstract class Address {
    private byteContainer: ByteContainer;
    private _decimal: number|undefined;

    public constructor(byteContainer: ByteContainer) {
        this.byteContainer = byteContainer;
    }

    /**
     * Returns the string representation of the address.
     */
    public abstract getIpString(): string;

    /**
     * Returns the octets of the address as an array of bytes (number from 0 to
     * 255).
     *
     * The length of this array is determined by the address size.
     */
    public getOctets(): ReadonlyArray<number> {
        return this.byteContainer.bytes;
    }

    /**
     * Returns the address in decimal format.
     *
     * WARNING!
     * Due to Javascript limitations (and because I don't want to depend on a
     * bignum library) this function may returns inaccurate results if the
     * decimal address value is bigger than 2^53.
     */
    public getDecimal(): number {
        if (typeof this._decimal === "undefined") {
            this._decimal = this.getOctets().reduce(
                (total, octet, index) => total + octet * (2 ** (8 * (4 - index - 1))),
                0,
            );
        }
        return this._decimal;
    }

    /**
     * Returns `getIpString()`.
     */
    public toString(): string {
        return this.getIpString();
    }

    /**
     * Returns if `this` is the same address as `other`.
     */
    public eq(other: this): boolean {
        return this.byteContainer.compareWith(other.getOctets()) === comparison.Equal;
    }

    /**
     * Returns if `this` is a different address than `other`.
     */
    public ne(other: this): boolean {
        return this.byteContainer.compareWith(other.getOctets()) !== comparison.Equal;
    }

    /**
     * Returns if `this` is greater than `other`.
     */
    public gt(other: this): boolean {
        return this.byteContainer.compareWith(other.getOctets()) === comparison.Greater;
    }

    /**
     * Returns if `this` is lesser than `other`.
     */
    public lt(other: this): boolean {
        return this.byteContainer.compareWith(other.getOctets()) === comparison.Lesser;
    }

    /**
     * Returns if `this` is greater or equal than `other`.
     */
    public ge(other: this): boolean {
        const result = this.byteContainer.compareWith(other.getOctets());
        return result === comparison.Greater || result === comparison.Equal;
    }

    /**
     * Returns if `this` is lesser or equal than `other`.
     */
    public le(other: this): boolean {
        const result = this.byteContainer.compareWith(other.getOctets());
        return result === comparison.Lesser || result === comparison.Equal;
    }

    /**
     * Adds a certain amount of octets to `this` octets.
     *
     * `amount` must have at most the same length as `this` octet.s
     *
     * If `amount` is shorter than `this`, the octets of `amount` will be
     * treated as the lowest values.
     */
    public add(amount: ReadonlyArray<number>): this {
        return new (this.constructor as any)(this.byteContainer.add(amount));
    }

    /**
     * Substracts a certain amount of octets to `this` octets.
     *
     * `amount` must have at most the same length as `this` octets.
     *
     * If `amount` is shorter than `this`, the octets of `amount` will be
     * treated as the lowest values.
     */
    public substract(amount: ReadonlyArray<number>): this {
        return new (this.constructor as any)(this.byteContainer.subtract(amount));
    }
}


/**
 * IPv4 address.
 *
 * The objects of this class are meant to be immutable.
 */
export class Address4 extends Address {
    private _ipString: string|undefined;

    /**
     * Creates a new IPv4 address.
     *
     * Possible inputs are:
     * - A valid IPv4 as string.
     * - A number array with 4 octets.
     * - A [[ByteContainer]] - for internal use only.
     */
    public constructor(input: string | ReadonlyArray<number> | ByteContainer) {
        if (input instanceof ByteContainer) {
            super(input);
        } else if (input instanceof Array) {
            if (input.length > IPV4_BYTES) {
                throw new AddressValueError(input);
            }
            if (!isValidByteArray(input)) {
                throw new AddressValueError(input);
            }
            if (input.length < IPV4_BYTES) {
                input = Array(IPV4_BYTES - input.length).fill(0).concat(input);
            }
            super(new ByteContainer(input));
        } else if (typeof input === "string") {
            const addressSplitted = input.split(".");
            if (addressSplitted.length !== IPV4_BYTES) {
                throw new AddressValueError(input);
            }

            const octets = new ByteContainer(addressSplitted.map(
                (octet) => {
                    if (!isDecimalString(octet)) {
                        throw new AddressValueError(input as string);
                    }

                    const numberOctet = parseInt(octet, 10);
                    if (!isValidByte(numberOctet)) {
                        throw new AddressValueError(input as string);
                    }

                    return numberOctet;
                },
            ));
            super(octets);
        }
    }

    public getIpString(): string {
        if (typeof this._ipString === "undefined") {
            this._ipString = this.getOctets().join(".");
        }
        return this._ipString;
    }
}


/**
 * IPv6 address.
 *
 * The objects of this class are meant to be immutable.
 */
export class Address6 extends Address {
    private _fullString: string|undefined;
    private _rfc5952: string|undefined;

    /**
     * Creates a new IPv6 address.
     *
     * Possible inputs are:
     * - A valid IPv6 as string, in any shape.
     * - A number array with 16 or less octets.
     * - A [[ByteContainer]] - for internal use only.
     */
    public constructor(input: string | ReadonlyArray<number> | ByteContainer) {
        if (input instanceof ByteContainer) {
            super(input);
        } else if (input instanceof Array) {
            if (input.length > IPV6_BYTES) {
                throw new AddressValueError(input);
            }
            if (!isValidByteArray(input)) {
                throw new AddressValueError(input);
            }
            if (input.length < IPV6_BYTES) {
                input = Array(IPV6_BYTES - input.length).fill(0x00).concat(input);
            }
            super(new ByteContainer(input));
        } else if (typeof input === "string") {
            const addressSplitted = input.split(":");
            let shortenedIndex = null;
            let octets: number[] = [];
            for (const tuple of addressSplitted.entries()) {
                const index = tuple[0];
                let item = tuple[1];
                if (item === "") {
                    if (shortenedIndex === null) {
                        shortenedIndex = index;
                        continue;
                    }
                    if (shortenedIndex === 0 && index === 1) {
                        continue;
                    }
                    if (shortenedIndex === addressSplitted.length - 2 && index === addressSplitted.length - 1) {
                        continue;
                    }
                    throw new AddressValueError(input);
                }
                if (item.includes(".")) {
                    if (index !== addressSplitted.length - 1) {
                        throw new AddressValueError(input);
                    }
                    // Why should be `number[]` instead of
                    // `ReadonlyArray<number>` if `concat` doesn't modify the
                    // array?
                    octets = octets.concat(new Address4(item).getOctets() as number[]);
                    continue;
                }
                if (item.length > IPV6_SEGMENT_LENGTH) {
                    throw new AddressValueError(input);
                }
                if (item.length < IPV6_SEGMENT_LENGTH) {
                    item = Array(IPV6_SEGMENT_LENGTH - item.length).fill("0").join("") + item;
                }
                const firstOctet = item.slice(
                    0, IPV6_SEGMENT_LENGTH / 2,
                ).toLowerCase();
                const secondOctet = item.slice(
                    IPV6_SEGMENT_LENGTH / 2,
                ).toLowerCase();
                if (!isHexadecimalString(firstOctet)) {
                    throw new AddressValueError(input);
                }
                if (!isHexadecimalString(secondOctet)) {
                    throw new AddressValueError(input);
                }
                octets.push(parseInt(firstOctet, 16));
                octets.push(parseInt(secondOctet, 16));
            }
            if (shortenedIndex !== null) {
                shortenedIndex = shortenedIndex * 2;
                octets = octets.slice(0, shortenedIndex).concat(
                    Array(IPV6_BYTES - octets.length).fill(0),
                ).concat(
                    octets.slice(shortenedIndex),
                );
            }
            if (octets.length !== IPV6_BYTES) {
                throw new AddressValueError(input);
            }
            super(new ByteContainer(octets));
        }
    }

    /**
     * Returns the string address fully expanded.
     */
    public getFullString(): string {
        if (typeof this._fullString === "undefined") {
            this._fullString = this.getOctetsPair().map(
                (item) => item.map((octet) => hexOctetToString(octet)).join(""),
            ).join(":");
        }
        return this._fullString;
    }

    /**
     * Returns the string address compressed following RFC 5952.
     */
    public getRfc5952(): string {
        if (typeof this._rfc5952 === "undefined") {
            this._rfc5952 = this.calculateRfc5952();
        }
        return this._rfc5952;
    }

    /**
     * Same as [[Address6.getRfc5952]]
     */
    public getIpString(): string {
        return this.getRfc5952();
    }

    private getOctetsPair(): ReadonlyArray<ReadonlyArray<number>> {
        return this.getOctets().reduce(
            (total: number[][], current: number, index: number) => {
                if (index % 2 === 0) {
                    total.push([]);
                }
                total[total.length - 1].push(current);
                return total;
            },
            [],
        );
    }

    private calculateRfc5952(): string {
        const output = this.getOctetsPair().map(
            (item) => item.map(
                (octet) => hexOctetToString(octet),
            ).join("").replace(/^0{1,3}/, ""),
        ).join(":");
        enum ParseState {
            OctetBegin,
            Shorten,
            NotShorten,
        }
        interface Shorten {
            begin: number;
            end: number;
            length: number;
        }
        const shortens: Shorten[] = [];
        let state = ParseState.OctetBegin;
        const outputLength = output.length;
        let shortenBegin = 0;
        for (let index = 0; index < outputLength; index++) {
            const ch = output[index];
            switch (state) {
                case ParseState.OctetBegin:
                    if (ch === "0") {
                        shortenBegin = index;
                        state = ParseState.Shorten;
                    } else {
                        state = ParseState.NotShorten;
                    }
                    break;
                case ParseState.Shorten:
                    if (ch === "0" || ch === ":") {
                        break;
                    }
                    const shortenLength = index - shortenBegin;
                    if (shortenLength > 2) {
                        shortens.push({
                            begin: shortenBegin,
                            end: index,
                            length: shortenLength,
                        });
                    }
                    state = ParseState.NotShorten;
                    break;
                case ParseState.NotShorten:
                    if (ch === ":") {
                        state = ParseState.OctetBegin;
                    }
                    break;
            }
        }
        if (state === ParseState.Shorten) {
            const shortenLength = outputLength - shortenBegin;
            if (shortenLength > 2) {
                shortens.push({
                    begin: shortenBegin,
                    end: outputLength,
                    length: shortenLength,
                });
            }
        }
        if (shortens.length === 0) {
            return output;
        }
        const bestShorten = shortens.slice(1).reduce(
            (acc, current) => {
                if (acc.length < current.length) {
                    return current;
                }
                return acc;
            },
            shortens[0],
        );
        if (bestShorten.begin === 0) {
            return `::${output.slice(bestShorten.end)}`;
        }
        return `${output.slice(0, bestShorten.begin)}:${output.slice(bestShorten.end)}`;
    }
}

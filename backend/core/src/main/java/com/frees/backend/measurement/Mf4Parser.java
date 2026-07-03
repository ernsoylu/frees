package com.frees.backend.measurement;

import de.richardliebscher.mdf4.Channel;
import de.richardliebscher.mdf4.ChannelGroup;
import de.richardliebscher.mdf4.DataGroup;
import de.richardliebscher.mdf4.Mdf4File;
import de.richardliebscher.mdf4.Result;
import de.richardliebscher.mdf4.datatypes.ByteArrayType;
import de.richardliebscher.mdf4.datatypes.DataType;
import de.richardliebscher.mdf4.datatypes.FloatType;
import de.richardliebscher.mdf4.datatypes.IntegerType;
import de.richardliebscher.mdf4.datatypes.StringType;
import de.richardliebscher.mdf4.datatypes.UnsignedIntegerType;
import de.richardliebscher.mdf4.extract.RecordFactory;
import de.richardliebscher.mdf4.extract.SizedRecordReader;
import de.richardliebscher.mdf4.extract.de.Deserializer;
import de.richardliebscher.mdf4.extract.de.DeserializeInto;
import de.richardliebscher.mdf4.extract.de.Visitor;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * ASAM MDF4 (.mf4) parser backed by mdf4j (Apache-2.0). mdf4j memory-maps the
 * file and reads records lazily, so metadata parsing touches only block
 * headers and channel extraction streams one record at a time — the file is
 * never materialized on the heap.
 *
 * <p>Known limitations (mdf4j 0.2.0, spike support matrix in Mf4SpikeTest):
 * MDF ≤ 4.20 (deflate DZ blocks fine; 4.30 ZSTD/LZ4 rejected), identity +
 * linear conversions only (value-to-text channels read as raw numbers),
 * sorted files only.
 */
public final class Mf4Parser implements MeasurementParser {

    /** Every numeric sample type widened to double; invalid samples → NaN. */
    private static final Visitor<Double> AS_DOUBLE = new Visitor<>() {
        @Override
        public String expecting() {
            return "a numeric sample";
        }

        @Override
        public Double visitU8(byte v) {
            return (double) Byte.toUnsignedInt(v);
        }

        @Override
        public Double visitU16(short v) {
            return (double) Short.toUnsignedInt(v);
        }

        @Override
        public Double visitU32(int v) {
            return (double) Integer.toUnsignedLong(v);
        }

        @Override
        public Double visitU64(long v) {
            // Loses precision above 2^53 — acceptable for measurement data.
            return v >= 0 ? (double) v : Math.scalb((double) (v >>> 1), 1);
        }

        @Override
        public Double visitI8(byte v) {
            return (double) v;
        }

        @Override
        public Double visitI16(short v) {
            return (double) v;
        }

        @Override
        public Double visitI32(int v) {
            return (double) v;
        }

        @Override
        public Double visitI64(long v) {
            return (double) v;
        }

        @Override
        public Double visitF32(float v) {
            return (double) v;
        }

        @Override
        public Double visitF64(double v) {
            return v;
        }

        @Override
        public Double visitInvalid() {
            return Double.NaN;
        }
    };

    /** Writes the record's sample for one channel into a fixed slot. */
    private record DoubleInto(int slot) implements DeserializeInto<double[]> {
        @Override
        public void deserializeInto(Deserializer deserializer, double[] dest) throws IOException {
            dest[slot] = deserializer.deserialize_value(AS_DOUBLE);
        }
    }

    @Override
    public MeasurementMetadata parseMetadata(Path file) throws IOException, MeasurementParseException {
        Mdf4File mdf = open(file);
        List<MeasurementMetadata.GroupInfo> groups = new ArrayList<>();
        int index = 0;
        for (Result<DataGroup, IOException> dgResult : mdf.getDataGroups()) {
            DataGroup dataGroup = dgResult.get();
            for (Result<ChannelGroup, IOException> cgResult : dataGroup.getChannelGroups()) {
                ChannelGroup channelGroup = cgResult.get();
                List<MeasurementMetadata.ChannelInfo> channels = new ArrayList<>();
                for (Result<Channel, IOException> chResult : channelGroup.getChannels()) {
                    Channel channel = chResult.get();
                    channels.add(new MeasurementMetadata.ChannelInfo(
                            channel.getName(),
                            channel.getPhysicalUnit().orElse(null),
                            channel.isTimeMaster(),
                            kindOf(channel.getRawDataType())));
                }
                String name = channelGroup.getName().orElse("group " + index);
                groups.add(new MeasurementMetadata.GroupInfo(
                        index, name, channelGroup.getBlock().getCycleCount(), channels));
                index++;
            }
        }
        if (groups.isEmpty()) {
            throw new MeasurementParseException("The MDF4 file contains no channel groups.");
        }
        return new MeasurementMetadata(groups);
    }

    @Override
    public ChannelData extractChannel(Path file, int groupIndex, String channelName)
            throws IOException, MeasurementParseException {
        Mdf4File mdf = open(file);
        boolean[] channelFound = {false};
        SizedRecordReader<double[], Void> reader;
        try {
            reader = mdf.newRecordReader(new RecordFactory<double[], Void>() {
                private int currentGroup = -1;

                @Override
                public boolean selectGroup(DataGroup dataGroup, ChannelGroup group) {
                    currentGroup++;
                    return currentGroup == groupIndex;
                }

                @Override
                public DeserializeInto<double[]> selectChannel(
                        DataGroup dataGroup, ChannelGroup group, Channel channel) throws IOException {
                    if (channel.isTimeMaster()) {
                        return new DoubleInto(0);
                    }
                    if (channel.getName().equals(channelName)) {
                        channelFound[0] = true;
                        return new DoubleInto(1);
                    }
                    return null;
                }

                @Override
                public double[] createRecordBuilder() {
                    return new double[2];
                }

                @Override
                public Void finishRecord(double[] builder) {
                    return null;
                }
            });
        } catch (Exception e) {
            throw new MeasurementParseException(
                    "Could not read channel group " + groupIndex + ": " + e.getMessage(), e);
        }
        if (!channelFound[0]) {
            throw new MeasurementParseException(
                    "Channel \"" + channelName + "\" not found in group " + groupIndex + ".");
        }

        long size = reader.size();
        if (size > Integer.MAX_VALUE - 8) {
            throw new MeasurementParseException("Channel group has too many records: " + size);
        }
        int n = (int) size;
        double[] time = new double[n];
        double[] values = new double[n];
        double[] slot = new double[2];
        try {
            for (int i = 0; i < n && reader.hasNext(); i++) {
                slot[0] = Double.NaN;
                slot[1] = Double.NaN;
                reader.nextInto(slot);
                time[i] = slot[0];
                values[i] = slot[1];
            }
        } catch (IOException e) {
            // Truncated data section or unsupported DZ compression mid-stream.
            throw new MeasurementParseException(
                    "Failed reading samples of \"" + channelName + "\": " + e.getMessage(), e);
        }
        return new ChannelData(time, values);
    }

    private static Mdf4File open(Path file) throws IOException, MeasurementParseException {
        try {
            return Mdf4File.open(file);
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new MeasurementParseException("Not a readable MDF4 file: " + e.getMessage(), e);
        }
    }

    private static String kindOf(DataType type) {
        return type.accept(new DataType.Visitor<String, RuntimeException>() {
            @Override
            public String visit(IntegerType t) {
                return "analog";
            }

            @Override
            public String visit(UnsignedIntegerType t) {
                return "analog";
            }

            @Override
            public String visit(FloatType t) {
                return "analog";
            }

            @Override
            public String visit(StringType t) {
                return "string";
            }

            @Override
            public String visit(ByteArrayType t) {
                return "string";
            }

            @Override
            public String visitElse(DataType t) {
                return "string";
            }
        });
    }
}

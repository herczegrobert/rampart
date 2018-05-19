import React from 'react';
import { select } from "d3-selection";
import { line, curveCatmullRom } from "d3-shape";
import {haveMaxesChanged, calcScales, drawAxes} from "../utils/commonFunctions";
import {chartTitleCSS} from "../utils/commonStyles";

export const drawCurve = (svg, chartGeom, scales, data, colours) => {
  /* data is array of channelData */
  /* https://stackoverflow.com/questions/8689498/drawing-multiple-lines-in-d3-js */
  const makeLinePath = line()
    .x((d) =>scales.x(d.key))
    .y((d) =>scales.y(d.value))
    .curve(curveCatmullRom.alpha(0.3));

  svg.selectAll(".line").remove();
  try {
    svg.selectAll(".line")
      .data(data)
      .enter().append("path")
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", (d, i) => colours[i])
      .attr('d', makeLinePath);
  } catch (err) {
    console.log("d3 spark lines error", err)
  }
}


/* draw the genes (annotations) */
const drawGenes = (svg, chartGeom, scales, annotation) => {
  svg.selectAll(".annotation").remove();
  const geneHeight = 15;
  const spaceAvailable = chartGeom.spaceBottom - 10; /* allow for x labels */
  const geneYLinePositiveStrand = chartGeom.height - spaceAvailable + geneHeight;

  const genes = annotation.genes
  const geneNames = Object.keys(annotation.genes);

  const genesSel = svg.selectAll(".gene")
    .data(geneNames)
    .enter()
    .append("g");

  genesSel.append("rect")
    .attr("class", "gene")
    .attr("x", (name) => {console.log(name); return scales.x(genes[name].start)})
    .attr("y", (name) => genes[name].strand === 1 ? geneYLinePositiveStrand : geneYLinePositiveStrand-geneHeight)
    .attr("width", (name) => scales.x(genes[name].end) - scales.x(genes[name].start))
    .attr("height", geneHeight)
    .style("fill", "none")
    .style("stroke", "black");

  genesSel.append("text")
    .attr("x", (name) => scales.x(genes[name].start) + (scales.x(genes[name].end) - scales.x(genes[name].start))/2)
    .attr("y", (name) => genes[name].strand === 1 ? geneYLinePositiveStrand : geneYLinePositiveStrand-geneHeight)
    .attr("dy", ".9em")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "ideographic")
    .style("fill", "black")
    .text((name) => name);
};


/* given the DOM dimensions of the chart container, calculate the chart geometry (used by the SVG & D3) */
const calcChartGeom = (DOMRect) => ({
  width: DOMRect.width,
  height: DOMRect.height - 20, // title line
  spaceLeft: 40,
  spaceRight: 10,
  spaceBottom: 60,
  spaceTop: 10
});

const getMaxCoverage = (coveragePerChannel) =>
  coveragePerChannel.reduce((outerAcc, channelData) => {
    const channelMax = channelData.reduce((innerAcc, point) => {
      return point.value > innerAcc ? point.value : innerAcc;
    }, 0);
    return channelMax > outerAcc ? channelMax : outerAcc;
  }, 0)

class CoveragePlot extends React.Component {
  constructor(props) {
    super(props);
    this.state = {chartGeom: {}};
  }
  componentDidMount() {
    console.log("ANN", this.props.annotation)
    const newState = {
      SVG: select(this.DOMref),
      chartGeom: calcChartGeom(this.boundingDOMref.getBoundingClientRect())
    }
    newState.scales = calcScales(newState.chartGeom, this.props.annotation.genome.length, getMaxCoverage(this.props.coveragePerChannel));
    drawAxes(newState.SVG, newState.chartGeom, newState.scales)
    drawCurve(newState.SVG, newState.chartGeom, newState.scales, this.props.coveragePerChannel, this.props.colours)
    this.setState(newState);
    drawGenes(newState.SVG, newState.chartGeom, newState.scales, this.props.annotation)
  }

  componentDidUpdate(prevProps) {
    if (prevProps.version !== this.props.version) {
      const newState = {
        scales: this.state.scales
      };
      const coverageMax = getMaxCoverage(this.props.coveragePerChannel);
      if (haveMaxesChanged(this.state.scales, this.props.annotation.genome.length, coverageMax)) {
        newState.scales = calcScales(this.state.chartGeom, this.props.annotation.genome.length, coverageMax);
        drawAxes(this.state.SVG, this.state.chartGeom, newState.scales)
      }
      drawCurve(this.state.SVG, this.state.chartGeom, newState.scales, this.props.coveragePerChannel, this.props.colours)
      this.setState(newState)
    }
  }
  render() {
    return (
      <div style={{...this.props.style}} ref={(r) => {this.boundingDOMref = r}}>
        <div {...chartTitleCSS}>{this.props.title}</div>
        <svg
          ref={(r) => {this.DOMref = r}}
          height={this.state.chartGeom.height || 0}
          width={this.state.chartGeom.width || 0}
        />
      </div>
    )
  }
}

export default CoveragePlot;

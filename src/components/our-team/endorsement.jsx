export default function Endorsement({ endorsement }) {
	return (
		<div className="w-screen xl:w-full -ml-[5vw] xl:ml-0 mb-8 xl:mb-20 bg-primary-light p-6 xl:px-16 xl:py-8 flex flex-col justify-between items-center overflow text-white">
			<div className="font-jose text-xs italic xl:text-xl text-justify mb-4">
				{endorsement.content.map((element, index) => (
					<p
						className="mb-4 xl:mb-6"
						key={index}
					>
						{element}
					</p>
				))}
			</div>
			<div className="flex flex-col items-end w-full">
				<span className="font-jose text-xs xl:text-xl italic font-bold text-right block">
					{endorsement.name}
				</span>
				<span className="font-jose text-xs xl:text-xl italic text-right block">
					{endorsement.title}
				</span>
			</div>
		</div>
	)
}
